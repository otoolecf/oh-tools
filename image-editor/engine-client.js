// Image pipelines stay in a browser worker. Only metadata and encoded previews
// cross the boundary; operators can continue building lazy VIPS pipelines.
export async function createImageEngine() {
  const worker = new Worker('/image-editor/engine-worker.js', { name: 'oh-tools-image-engine' });
  const pending = new Map();
  const states = new WeakMap();
  let sequence = 0;
  let stopped = false;
  const release = new FinalizationRegistry(id => {
    if (!stopped) worker.postMessage({ type: 'release', image: id });
  });
  const fail = error => {
    for (const task of pending.values()) task.reject(error);
    pending.clear();
  };
  worker.addEventListener('error', event => {
    stopped = true;
    fail(new Error(event.message || 'Image worker failed. Reload the page to try again.'));
  });
  worker.addEventListener('message', ({ data }) => {
    const task = pending.get(data.id);
    if (!task) return;
    pending.delete(data.id);
    if (data.error) task.reject(new Error(data.error));
    else task.resolve(data.result);
  });
  const request = (type, data = {}) => new Promise((resolve, reject) => {
    if (stopped) return reject(new Error('The image engine is no longer available. Reload the page to try again.'));
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    try {
      worker.postMessage({ id, type, ...data });
    } catch (error) {
      pending.delete(id);
      reject(error);
    }
  });
  const encode = value => {
    const state = value && typeof value === 'object' && states.get(value);
    if (state) return { image: state.id ? { ref: state.id } : encode(state.plan) };
    if (Array.isArray(value)) return value.map(encode);
    if (value && Object.getPrototypeOf(value) === Object.prototype) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
    }
    return value;
  };
  const image = (plan, resolved) => {
    const state = { plan, ...resolved };
    const resolve = async () => {
      if (!state.id) {
        state.loading ||= request('evaluate', { plan: encode(state.plan) });
        const result = await state.loading;
        Object.assign(state, result);
        state.plan = null;
        release.register(proxy, state.id);
      }
    };
    const proxy = new Proxy({}, {
      get(_, key) {
        // Once resolved, remove thenability so Promise resolution is finite.
        if (key === 'then') return state.id ? undefined : (done, failed) => resolve().then(() => done(proxy), failed);
        if (key === 'writeToBuffer' || key === 'getpoint') return async (...args) => {
          await resolve();
          return request('value', { image: state.id, method: key, args: encode(args) });
        };
        if (key === 'getFields') return () => ({ size: () => state.meta.fields.length, get: i => state.meta.fields[i] });
        if (key === 'hasAlpha') return () => state.meta.hasAlpha;
        if (state.meta && key in state.meta) return state.meta[key];
        if (['width', 'height', 'bands', 'format', 'interpretation', 'xres', 'yres'].includes(key)) {
          throw new Error(`Resolve the image before reading ${key}.`);
        }
        if (typeof key !== 'string') return undefined;
        return (...args) => image({ method: key, target: proxy, args });
      },
    });
    states.set(proxy, state);
    if (resolved) release.register(proxy, state.id);
    return proxy;
  };
  await request('init');
  window.addEventListener('pagehide', event => {
    if (!event.persisted) {
      stopped = true;
      worker.terminate();
      fail(new Error('Image editor closed.'));
    }
  });
  return {
    Image: new Proxy({}, { get: (_, method) => (...args) => image({ static: method, args }) }),
    BandFormat: new Proxy({}, { get: (_, name) => ({ enum: ['BandFormat', name] }) }),
    async loadImage(buffer, options = {}) {
      if (options.heic) {
        // Decoding uses the converter's own worker; PNG encoding needs a DOM
        // canvas in this locked version. Load it only for selected HEIC files.
        const { heicTo } = await import('heic-to');
        const png = await heicTo({ blob: new Blob([buffer]), type: 'image/png', quality: 1 });
        buffer = new Uint8Array(await png.arrayBuffer());
      }
      return image(null, await request('load', { buffer }));
    },
  };
}
