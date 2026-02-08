import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  EncodedPacketSink,
  Input,
  MkvOutputFormat,
  MovOutputFormat,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  StreamTarget,
  WebMOutputFormat,
  AudioSample,
  canEncodeAudio,
  canEncodeVideo,
} from 'https://cdn.jsdelivr.net/npm/mediabunny@1.32.0/dist/bundles/mediabunny.mjs';

const US_PER_SECOND = 1_000_000;

function secondsToUs(seconds) {
  return Math.round(seconds * US_PER_SECOND);
}

function usToSeconds(us) {
  return us / US_PER_SECOND;
}

export class VideoEngine {
  constructor() {
    this.input = null;
    this.file = null;
    this.metadata = null;
    this.videoTrack = null;
    this.audioTrack = null;
    this.exportConversion = null;
    this.thumbnailVideo = document.createElement('video');
    this.thumbnailVideo.muted = true;
    this.thumbnailVideo.preload = 'metadata';
    this.thumbCanvas = document.createElement('canvas');
  }

  async loadFile(file) {
    this.dispose();
    this.file = file;
    this.input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });

    const duration = secondsToUs(await this.input.computeDuration());
    this.videoTrack = await this.input.getPrimaryVideoTrack();
    this.audioTrack = await this.input.getPrimaryAudioTrack();
    if (!this.videoTrack) {
      throw new Error('No video track found in this file.');
    }

    const packetStats = await this.videoTrack.computePacketStats(300);
    const frameRate = packetStats.averagePacketRate || 0;

    const keyframes = await this.#scanKeyframes(this.videoTrack);
    const avgKeyframeInterval = keyframes.length > 1
      ? Math.round((keyframes[keyframes.length - 1] - keyframes[0]) / (keyframes.length - 1))
      : 0;

    const containerFormat = (await this.input.getFormat())?.name?.toLowerCase?.() || 'unknown';

    this.metadata = {
      duration,
      videoCodec: this.videoTrack.codec || 'unknown',
      videoCodecFull: await this.videoTrack.getCodecParameterString(),
      width: this.videoTrack.codedWidth,
      height: this.videoTrack.codedHeight,
      displayWidth: this.videoTrack.displayWidth,
      displayHeight: this.videoTrack.displayHeight,
      rotation: this.videoTrack.rotation,
      frameRate,
      videoBitrate: packetStats.averageBitrate || null,
      audioCodec: this.audioTrack?.codec || null,
      audioSampleRate: this.audioTrack?.sampleRate || null,
      audioChannels: this.audioTrack?.numberOfChannels || null,
      audioBitrate: this.audioTrack ? (await this.audioTrack.computePacketStats(300)).averageBitrate || null : null,
      containerFormat,
      fileSize: file.size,
      fileName: file.name,
      keyframes,
      keyframeCount: keyframes.length,
      avgKeyframeInterval,
    };

    return this.metadata;
  }

  async getThumbnail(timestampUs, width = 160) {
    if (!this.file) {
      throw new Error('No file loaded');
    }

    const video = this.thumbnailVideo;
    if (!video.src) {
      video.src = URL.createObjectURL(this.file);
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error('Could not prepare thumbnail generator'));
      });
    }

    const target = Math.max(0, usToSeconds(timestampUs));
    await new Promise((resolve, reject) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      const onError = () => {
        video.removeEventListener('error', onError);
        reject(new Error('Thumbnail seek failed'));
      };
      video.addEventListener('seeked', onSeeked, { once: true });
      video.addEventListener('error', onError, { once: true });
      video.currentTime = Math.min(target, video.duration || target);
    });

    const ratio = video.videoWidth / video.videoHeight || 16 / 9;
    this.thumbCanvas.width = width;
    this.thumbCanvas.height = Math.max(1, Math.round(width / ratio));
    const ctx = this.thumbCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, this.thumbCanvas.width, this.thumbCanvas.height);
    return this.thumbCanvas.toDataURL('image/jpeg', 0.75);
  }

  async isCodecSupported(codec) {
    const normalized = String(codec || '').toLowerCase();
    if (!normalized || normalized === 'copy') return true;
    try {
      if (['aac', 'opus', 'vorbis'].includes(normalized)) {
        return await canEncodeAudio(normalized);
      }
      return await canEncodeVideo(normalized);
    } catch {
      return false;
    }
  }

  getCompatibleCodecs(container) {
    const codecsByContainer = {
      mp4: { video: ['avc', 'hevc', 'av1', 'vp9'], audio: ['aac'] },
      webm: { video: ['vp8', 'vp9', 'av1'], audio: ['opus', 'vorbis'] },
      mkv: { video: ['avc', 'hevc', 'vp8', 'vp9', 'av1'], audio: ['aac', 'opus', 'vorbis'] },
      mov: { video: ['avc', 'hevc', 'av1'], audio: ['aac'] },
    };
    return codecsByContainer[container] || { video: [], audio: [] };
  }

  snapToKeyframe(timestampUs) {
    if (!this.metadata?.keyframes?.length) {
      return timestampUs;
    }

    let best = this.metadata.keyframes[0];
    let bestDiff = Math.abs(best - timestampUs);
    for (const key of this.metadata.keyframes) {
      const diff = Math.abs(key - timestampUs);
      if (diff < bestDiff) {
        best = key;
        bestDiff = diff;
      }
    }
    return best;
  }

  async exportVideo(options, onProgress) {
    if (!this.input || !this.metadata) {
      throw new Error('No file loaded');
    }

    const outputFormat = (options.outputFormat || this.metadata.containerFormat || 'mp4').toLowerCase();
    const videoCodecOption = (options.videoCodec || 'copy').toLowerCase();
    const audioCodecOption = (options.audioCodec || 'copy').toLowerCase();
    const compatible = this.getCompatibleCodecs(outputFormat);
    const sourceVideoCodec = (this.metadata.videoCodec || '').toLowerCase();
    const sourceAudioCodec = (this.metadata.audioCodec || '').toLowerCase();
    const hasAudio = Boolean(this.audioTrack && sourceAudioCodec);

    const videoCanCopy = videoCodecOption === 'copy'
      && compatible.video.includes(sourceVideoCodec);
    const audioCanCopy = !hasAudio || (audioCodecOption === 'copy'
      && compatible.audio.includes(sourceAudioCodec));

    let target;
    let writable = null;
    if (options.fileHandle) {
      writable = await options.fileHandle.createWritable();
      target = new StreamTarget(writable, { chunked: true, chunkSize: 16 * 1024 * 1024 });
    } else {
      target = new BufferTarget();
    }

    const output = new Output({
      format: this.#createOutputFormat(outputFormat),
      target,
    });

    const segments = (options.segments && options.segments.length)
      ? options.segments
      : [{
        start: Number.isFinite(options.trimStart) ? options.trimStart : 0,
        end: Number.isFinite(options.trimEnd) ? options.trimEnd : this.metadata.duration,
      }];
    const normalized = segments
      .map((seg) => ({ start: Math.max(0, seg.start), end: Math.max(0, seg.end) }))
      .sort((a, b) => a.start - b.start);
    const startUs = normalized[0].start;
    const endUs = normalized[normalized.length - 1].end;
    const trimTranscodeRequired = Boolean(options.forceTranscode || normalized.length > 1);
    const needsVideoTranscode = trimTranscodeRequired || videoCodecOption !== 'copy' || !videoCanCopy;
    const needsAudioTranscode = trimTranscodeRequired || (hasAudio && (audioCodecOption !== 'copy' || !audioCanCopy));
    const transmuxed = !needsVideoTranscode && !needsAudioTranscode;
    const conversionOptions = {
      input: this.input,
      output,
      trim: {
        start: usToSeconds(startUs),
        end: usToSeconds(endUs),
      },
    };

    if (normalized.length > 1) {
      const keepRanges = normalized.map((seg) => ({
        start: usToSeconds(seg.start - startUs),
        end: usToSeconds(seg.end - startUs),
      }));
      const rangesWithShift = [];
      let removed = 0;
      let previousEnd = keepRanges[0].start;
      for (const range of keepRanges) {
        removed += Math.max(0, range.start - previousEnd);
        rangesWithShift.push({ ...range, shift: removed });
        previousEnd = range.end;
      }
      const mapTimestamp = (timestamp, duration) => {
        const dur = Number.isFinite(duration) ? duration : 0;
        const end = timestamp + dur;
        const epsilon = 1e-6;
        for (const range of rangesWithShift) {
          const fullyInside = timestamp >= range.start - epsilon && end <= range.end + epsilon;
          if (fullyInside) return timestamp - range.shift;
        }
        return null;
      };
      conversionOptions.video = {
        forceTranscode: true,
        ...(videoCodecOption !== 'copy' ? { codec: videoCodecOption } : {}),
        ...this.#resolveQualityOptions(options.quality),
        process: (sample) => {
          const mapped = mapTimestamp(sample.timestamp, sample.duration);
          if (mapped === null) return null;
          sample.setTimestamp(mapped);
          return sample;
        },
      };
      conversionOptions.audio = {
        forceTranscode: true,
        ...(hasAudio && audioCodecOption !== 'copy' ? { codec: audioCodecOption } : {}),
        ...this.#resolveQualityOptions(options.quality),
        process: (sample) => {
          const duration = Number.isFinite(sample.duration) ? sample.duration : 0;
          const start = sample.timestamp;
          const end = start + duration;
          const epsilon = 1e-6;
          const overlaps = rangesWithShift
            .map((range) => {
              const overlapStart = Math.max(start, range.start);
              const overlapEnd = Math.min(end, range.end);
              if (overlapEnd - overlapStart <= 0) return null;
              return { ...range, overlapStart, overlapEnd };
            })
            .filter(Boolean);

          if (!overlaps.length) return null;
          if (overlaps.length === 1 && start >= overlaps[0].start - epsilon && end <= overlaps[0].end + epsilon) {
            sample.setTimestamp(start - overlaps[0].shift);
            return sample;
          }

          const audioBuffer = sample.toAudioBuffer();
          const results = [];
          for (const overlap of overlaps) {
            const offsetFrames = Math.round((overlap.overlapStart - start) * audioBuffer.sampleRate);
            const lengthFrames = Math.max(0, Math.round((overlap.overlapEnd - overlap.overlapStart) * audioBuffer.sampleRate));
            if (lengthFrames <= 0) continue;
            const slice = new AudioBuffer({
              numberOfChannels: audioBuffer.numberOfChannels,
              length: lengthFrames,
              sampleRate: audioBuffer.sampleRate,
            });
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
              const temp = new Float32Array(lengthFrames);
              audioBuffer.copyFromChannel(temp, channel, offsetFrames);
              slice.copyToChannel(temp, channel, 0);
            }
            const newSamples = AudioSample.fromAudioBuffer(slice, overlap.overlapStart - overlap.shift);
            results.push(...newSamples);
          }
          sample.close();
          return results;
        },
      };
    } else {
      if (needsVideoTranscode) {
        conversionOptions.video = {
          forceTranscode: true,
          ...(videoCodecOption !== 'copy' ? { codec: videoCodecOption } : {}),
          ...this.#resolveQualityOptions(options.quality),
        };
      }
      if (hasAudio && needsAudioTranscode) {
        conversionOptions.audio = {
          forceTranscode: true,
          ...(audioCodecOption !== 'copy' ? { codec: audioCodecOption } : {}),
          ...this.#resolveQualityOptions(options.quality),
        };
      }
    }

    const conversion = await Conversion.init(conversionOptions);

    if (!conversion.isValid) {
      throw new Error('Could not create export conversion for this file.');
    }

    this.exportConversion = conversion;
    const operationMessage = transmuxed ? 'Transmuxing...' : 'Transcoding...';
    if (onProgress) {
      onProgress({ percent: null, message: operationMessage, indeterminate: true, transmuxed });
    }
    conversion.onProgress = (progress) => {
      if (onProgress) {
        onProgress({ percent: Math.round(progress * 100), message: operationMessage, indeterminate: false, transmuxed });
      }
    };

    try {
      await conversion.execute();
    } finally {
      this.exportConversion = null;
    }

    if (writable && typeof writable.close === 'function') {
      try {
        await writable.close();
      } catch {
        // Ignore stream close errors here; conversion completion is the source of truth.
      }
    }

    if (options.fileHandle) {
      const savedFile = await options.fileHandle.getFile();
      return {
        blob: null,
        fileSize: savedFile.size,
        duration: normalized.reduce((sum, seg) => sum + (seg.end - seg.start), 0),
        transmuxed,
      };
    }

    const blob = new Blob([target.buffer], { type: this.#mimeForContainer(outputFormat) });
    return {
      blob,
      fileSize: blob.size,
      duration: normalized.reduce((sum, seg) => sum + (seg.end - seg.start), 0),
      transmuxed,
    };
  }

  async cancelExport() {
    if (this.exportConversion) {
      await this.exportConversion.cancel();
      this.exportConversion = null;
    }
  }

  dispose() {
    if (this.thumbnailVideo.src?.startsWith('blob:')) {
      URL.revokeObjectURL(this.thumbnailVideo.src);
      this.thumbnailVideo.removeAttribute('src');
    }
    if (this.input) {
      this.input.dispose();
      this.input = null;
    }
    this.metadata = null;
    this.videoTrack = null;
    this.audioTrack = null;
  }

  async #scanKeyframes(track) {
    const sink = new EncodedPacketSink(track);
    const keyframes = [];
    for await (const packet of sink.packets()) {
      if (packet.type === 'key') {
        keyframes.push(secondsToUs(packet.timestamp));
      }
    }
    if (!keyframes.length) {
      keyframes.push(0);
    }
    return keyframes;
  }

  #createOutputFormat(format) {
    const normalized = (format || '').toLowerCase();
    if (normalized === 'webm') return new WebMOutputFormat();
    if (normalized === 'mkv') return new MkvOutputFormat();
    if (normalized === 'mov') return new MovOutputFormat();
    return new Mp4OutputFormat();
  }

  #resolveQualityOptions(quality) {
    const normalized = String(quality || 'medium').toLowerCase();
    if (normalized === 'high') return { bitrate: QUALITY_HIGH };
    if (normalized === 'low') return { bitrate: QUALITY_LOW };
    if (normalized === 'medium') return { bitrate: QUALITY_MEDIUM };
    const numeric = Number(quality);
    if (Number.isFinite(numeric) && numeric > 0) {
      return { bitrate: numeric };
    }
    return { bitrate: QUALITY_MEDIUM };
  }

  #mimeForContainer(container) {
    if (container === 'webm') return 'video/webm';
    if (container === 'mkv') return 'video/x-matroska';
    if (container === 'mov') return 'video/quicktime';
    return 'video/mp4';
  }
}

window.VideoEngine = VideoEngine;
window.VT_US_PER_SECOND = US_PER_SECOND;
