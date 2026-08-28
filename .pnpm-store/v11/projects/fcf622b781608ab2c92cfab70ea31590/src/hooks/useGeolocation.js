import { useState, useEffect } from 'react';

let geolocationPromise = null;

function fetchFallbackIp(resolve) {
  fetch('https://ipapi.co/json/')
    .then(r => r.json())
    .then(resolve)
    .catch(err => {
      console.error('IP Info fetch failed:', err);
      resolve(null);
    });
}

export function fetchIpInfo() {
  if (!geolocationPromise) {
    geolocationPromise = new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
              .then(res => res.json())
              .then(data => {
                const address = data.address || {};
                const city = address.city || address.town || address.village || address.county || 'Unknown Location';
                resolve({ city, country_name: address.country || '', ip: 'GPS Verified' });
              })
              .catch(() => {
                fetchFallbackIp(resolve);
              });
          },
          () => {
            fetchFallbackIp(resolve);
          },
          { timeout: 8000 }
        );
      } else {
        fetchFallbackIp(resolve);
      }
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
