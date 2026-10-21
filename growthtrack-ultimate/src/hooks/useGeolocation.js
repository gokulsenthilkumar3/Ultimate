import { useState, useEffect } from 'react';

let geolocationPromise = null;

function fetchFallbackIp(resolve) {
  fetch('https://ipapi.co/json/')
    .then(r => r.json())
    .then(resolve)
    .catch(() => {
      resolve(null);
    });
}

export function fetchIpInfo() {
  if (!geolocationPromise) {
    // Passive network diagnostics never trigger a browser location prompt.
    geolocationPromise = new Promise(fetchFallbackIp);
  }
  return geolocationPromise;
}

export function useGeolocation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetchIpInfo().then(result => {
      if (mounted) {
        setData(result);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading };
}
