// Classic worker: the Emscripten loader also starts classic pthread workers.
// No images leave the user's browser.
let vips;
let initialization;
let nextImage = 0;
const images = new Map();
const vendor = '/vendor/wasm-vips-0.0.19/';

function initialize() {
  initialization ||= (async () => {
    importScripts(`${vendor}vips.js`);
    vips = await Vips({
      mainScriptUrlOrBlob: new URL(`${vendor}vips.js`, self.location.href).href,
      locateFile: path => new URL(`${vendor}${path}`, self.location.href).href,
      dynamicLibraries: ['vips-heif.wasm', 'vips-jxl.wasm', 'vips-resvg.wasm'],
    });
  })();
  return initialization;
}

function retain(image) {
  const id = ++nextImage;
  images.set(id, image);
  const fields = image.getFields();
  const meta = Object.fromEntries(['width', 'height', 'bands', 'format', 'interpretation', 'xres', 'yres'].map(key => [key, image[key]]));
  meta.hasAlpha = image.hasAlpha();
  meta.fields = Array.from({ length: fields.size() }, (_, i) => fields.get(i));
  fields.delete?.();
  return { id, meta };
}

function decode(value, temporary) {
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    if (value.image) return evaluate(value.image, temporary);
    if (value.enum) return vips[value.enum[0]][value.enum[1]];
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item, temporary)]));
  }
  return Array.isArray(value) ? value.map(item => decode(item, temporary)) : value;
}

function evaluate(plan, temporary) {
  if (plan.ref) {
    if (!images.has(plan.ref)) throw new Error('The image is no longer available. Choose it again.');
    return images.get(plan.ref);
  }
  const target = plan.static ? vips.Image : decode(plan.target, temporary);
  const method = plan.static || plan.method;
  if (!/^[a-zA-Z][\w]*$/.test(method) || ['constructor', 'prototype'].includes(method) || typeof target[method] !== 'function') {
    throw new Error('Unsupported image operation.');
  }
  const result = target[method](...decode(plan.args, temporary));
  temporary.add(result);
  return result;
}

self.onmessage = async ({ data }) => {
  if (data.type === 'release') {
    images.get(data.image)?.delete();
    images.delete(data.image);
    return;
  }
  const temporary = new Set();
  let retained;
  try {
    await initialize();
    let result;
    if (data.type === 'init') result = true;
    else if (data.type === 'load') {
      retained = vips.Image.newFromBuffer(data.buffer);
      result = retain(retained);
    } else if (data.type === 'evaluate') {
      retained = evaluate(data.plan, temporary);
      result = retain(retained);
    } else if (data.type === 'value') {
      const image = images.get(data.image);
      if (!image) throw new Error('The image is no longer available. Choose it again.');
      if (!['writeToBuffer', 'getpoint'].includes(data.method)) throw new Error('Unsupported image output.');
      result = image[data.method](...decode(data.args, temporary));
      if (data.method === 'writeToBuffer') result = Uint8Array.from(result);
    } else throw new Error('Unknown image request.');
    self.postMessage({ id: data.id, result }, result instanceof Uint8Array ? [result.buffer] : []);
  } catch (error) {
    self.postMessage({ id: data.id, error: error.message || String(error) });
  } finally {
    for (const image of temporary) if (image !== retained) image?.delete?.();
  }
};
