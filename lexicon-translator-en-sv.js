/*
  Lexicon Translator – EN → SV
  SAFE version (never leaves LexiconTranslate undefined)
*/

(function () {
  console.log('[Lexicon] Script loaded');

  // 🔒 ALWAYS define the function first
  window.LexiconTranslate = async function (text) {
    console.warn('[Lexicon] Translator not ready yet, returning original text');
    return text;
  };

  let worker = null;
  let ready = false;
  const pending = new Map();

  async function init() {
    try {
      console.log('[Lexicon] Initializing worker…');

      // 1️⃣ Fetch worker JS as text
      const res = await fetch(
        'https://unpkg.com/bergamot-translator-web@1.1.0/dist/worker.js'
      );
      const code = await res.text();

      // 2️⃣ Create same-origin worker
      const blob = new Blob([code], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      worker = new Worker(url);

      // 3️⃣ Load model
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
          console.log('[Lexicon] Translator READY');

          // 🔁 Replace function with REAL implementation
          window.LexiconTranslate = function (text) {
            return new Promise((resolve) => {
              pending.set(text, resolve);
              worker.postMessage({ type: 'translate', text });
            });
          };
        }

        if (type === 'translation') {
          const { text, result } = translation;
          pending.get(text)?.(result);
          pending.delete(text);
        }
      };
    } catch (err) {
      console.error('[Lexicon] Failed to initialize', err);
    }
  }

  init();
})();
