import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapCanvas({ points }) {
  const element = useRef(null);
  useEffect(() => {
    const map = L.map(element.current, { scrollWheelZoom: false }).setView([0, 0], 2);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    const valid = points.filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
    for (const point of valid) L.circleMarker([point.latitude, point.longitude], { radius: 6 }).addTo(map).bindTooltip(new Date(point.capturedAt).toLocaleString());
    if (valid.length) map.fitBounds(valid.map(point => [point.latitude, point.longitude]), { padding: [24, 24], maxZoom: 15 });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(element.current);
    return () => { observer.disconnect(); map.remove(); };
  }, [points]);
  return <div ref={element} className="places-map" aria-label="Saved places map. Equivalent coordinates are listed below." style={{ blockSize: 'clamp(240px, 45vh, 480px)', minInlineSize: 0, zIndex: 0 }} />;
}
