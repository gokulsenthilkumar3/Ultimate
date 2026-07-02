// Sprite Preloader Worker
// This worker fetches images in the background and converts them to ImageBitmaps
// for zero-lag transfer to the main thread.

self.onmessage = async (e) => {
  const { urls } = e.data;
  
  const results = [];
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      results.push({ url, bitmap });
      
      // Send individual progress if needed
      self.postMessage({ type: 'PROGRESS', url, bitmap }, [bitmap]);
    } catch (err) {
      console.error(`Worker failed to load ${url}:`, err);
      self.postMessage({ type: 'ERROR', url, error: err.message });
    }
  }
  
  self.postMessage({ type: 'COMPLETE' });
};
