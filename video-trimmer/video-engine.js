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
  WebMOutputFormat,
  canEncodeVideo,
} from './lib/mediabunny.esm.js';

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
    try {
      return await canEncodeVideo(codec);
    } catch {
      return false;
    }
  }

  getCompatibleCodecs(container) {
    const codecsByContainer = {
      mp4: { video: ['avc', 'hevc', 'av1', 'vp9'], audio: ['aac', 'opus'] },
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

    const target = new BufferTarget();
    const output = new Output({
      format: this.#createOutputFormat(options.outputFormat),
      target,
    });

    const conversion = await Conversion.init({
      input: this.input,
      output,
      trim: {
        start: usToSeconds(options.trimStart),
        end: usToSeconds(options.trimEnd),
      },
    });

    if (!conversion.isValid) {
      throw new Error('Could not create export conversion for this file.');
    }

    this.exportConversion = conversion;
    conversion.onProgress = (progress) => {
      if (onProgress) {
        onProgress({ percent: Math.round(progress * 100), message: 'Trimming video...' });
      }
    };

    await conversion.execute();
    this.exportConversion = null;

    const blob = new Blob([target.buffer], { type: `video/${options.outputFormat}` });
    return {
      blob,
      fileSize: blob.size,
      duration: options.trimEnd - options.trimStart,
      transmuxed: true,
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
}

window.VideoEngine = VideoEngine;
window.VT_US_PER_SECOND = US_PER_SECOND;
