/* 
  Lexicon Translator – EN → SV
  Offline WASM (Bergamot / OPUS-MT)
  Exposes: window.LexiconTranslate(text)
*/

(function () {
  let ready = false;
  let worker = null;
  let queue = [];

  console.log('[Lexicon WASM] Loading translator…');

  // 1️⃣ Load Bergamot worker (prebuilt)
  const workerScript =
    'https://unpkg.com/bergamot-translator-web@1.1.0/dist/worker.js';

  worker = new Worker(workerScript);

  // 2️⃣ Configure model (EN → SV)
  worker.postMessage({
    type: 'loadModel',
    config: {
      from: 'en',
      to: 'sv',
      modelUrl:
        'https://unpkg.com/bergamot-translator-web@1.1.0/dist/models/en-sv'
    }
  });

  // 3️⃣ Handle worker messages
  worker.onmessage = function (e) {
    const { type, translation } = e.data;

    if (type === 'ready') {
      ready = true;
      console.log('[Lexicon WASM] Translator ready');

      // Flush queued requests
      queue.forEach(({ text, resolve }) => {
        worker.postMessage({ type: 'translate', text });
        resolve();
      });
      queue = [];
    }

    if (type === 'translation') {
      const { text, result } = translation;
      pending.get(text)?.(result);
      pending.delete(text);
    }
  };

  const pending = new Map();

  // 4️⃣ Expose GLOBAL function (Bubble calls this)
  window.LexiconTranslate = function (text) {
    return new Promise((resolve) => {
      if (!ready) {
        queue.push({ text, resolve });
        return;
      }

      pending.set(text, resolve);
      worker.postMessage({ type: 'translate', text });
    });
  };
})();
