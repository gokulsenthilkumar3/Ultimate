// Sprite Preloader Worker
// This worker fetches images in the background and converts them to ImageBitmaps
// for zero-lag transfer to the main thread.

const requestIdle = self.requestIdleCallback || ((cb) => setTimeout(cb, 1));

self.onmessage = (e) => {
  const { urls } = e.data;
  let i = 0;

  const processNext = () => {
    if (i >= urls.length) {
      self.postMessage({ type: 'COMPLETE' });
      return;
    }

    const url = urls[i++];
    requestIdle(async () => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        
        self.postMessage({ type: 'PROGRESS', url, bitmap }, [bitmap]);
      } catch (err) {
        console.error(`Worker failed to load ${url}:`, err);
        self.postMessage({ type: 'ERROR', url, error: err.message });
      }
      processNext();
    });
  };

  processNext();
};
