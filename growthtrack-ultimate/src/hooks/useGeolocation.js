import { useState, useEffect } from 'react';

let geolocationPromise = null;

export function fetchIpInfo() {
  if (!geolocationPromise) {
    geolocationPromise = fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .catch(err => {
        console.error('IP Info fetch failed:', err);
        return null;
      });
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
