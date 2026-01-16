/*
  Lexicon Translator – EN → SV
  HARDENED VERSION (never hangs)
*/

(function () {
  console.log('[Lexicon] Script loaded');

  // Always defined
  window.__LEXICON_TRANSLATOR_READY__ = false;

  window.LexiconTranslate = async function (text) {
    console.warn('[Lexicon] Translator not ready, fallback');
    return text;
  };

  let worker;
  const pending = new Map();

  async function init() {
    try {
      console.log('[Lexicon] Fetching worker…');

      const res = await fetch(
        'https://unpkg.com/bergamot-translator-web@1.1.0/dist/worker.js'
      );

      if (!res.ok) throw new Error('Worker fetch failed');

      const code = await res.text();
      const blob = new Blob([code], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);

      worker = new Worker(url);

      console.log('[Lexicon] Worker created');

      worker.onmessage = (e) => {
        const { type, translation } = e.data;

        if (type === 'ready') {
          console.log('[Lexicon] MODEL READY');
          window.__LEXICON_TRANSLATOR_READY__ = true;

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

      console.log('[Lexicon] Loading model…');

      worker.postMessage({
        type: 'loadModel',
        config: {
          from: 'en',
          to: 'sv',
          modelUrl:
            'https://unpkg.com/bergamot-translator-web@1.1.0/dist/models/en-sv'
        }
      });

      // ⏱️ HARD TIMEOUT (CRITICAL)
      setTimeout(() => {
        if (!window.__LEXICON_TRANSLATOR_READY__) {
          console.error('[Lexicon] Translator FAILED to initialize');
        }
      }, 8000);

    } catch (err) {
      console.error('[Lexicon] Fatal init error', err);
    }
  }

  init();
})();
