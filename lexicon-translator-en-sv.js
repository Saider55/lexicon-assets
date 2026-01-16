/*
  Lexicon Translator – EN → SV
  Offline-ready architecture (Worker via Blob)
*/

(function () {
  console.log('[Lexicon] Initializing translator…');

  let worker = null;
  let ready = false;
  const pending = new Map();

  async function createWorker() {
    // 1️⃣ Fetch worker source as TEXT
    const res = await fetch(
      'https://unpkg.com/bergamot-translator-web@1.1.0/dist/worker.js'
    );
    const workerCode = await res.text();

    // 2️⃣ Create Blob (same-origin)
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const blobURL = URL.createObjectURL(blob);

    // 3️⃣ Create Worker from Blob
    worker = new Worker(blobURL);

    // 4️⃣ Load model
    worker.postMessage({
      type: 'loadModel',
      config: {
        from: 'en',
        to: 'sv',
        modelUrl:
          'https://unpkg.com/bergamot-translator-web@1.1.0/dist/models/en-sv'
      }
    });

    worker.onmessage = (e) => {
      const { type, translation } = e.data;

      if (type === 'ready') {
        ready = true;
        console.log('[Lexicon] Translator ready');
      }

      if (type === 'translation') {
        const { text, result } = translation;
        pending.get(text)?.(result);
        pending.delete(text);
      }
    };
  }

  // Start loading immediately
  createWorker().catch((err) => {
    console.error('[Lexicon] Worker failed', err);
  });

  // 5️⃣ Expose GLOBAL function (Bubble uses this)
  window.LexiconTranslate = async function (text) {
    if (!ready) {
      console.warn('[Lexicon] Translator not ready yet');
      return text;
    }

    return new Promise((resolve) => {
      pending.set(text, resolve);
      worker.postMessage({ type: 'translate', text });
    });
  };
})();
