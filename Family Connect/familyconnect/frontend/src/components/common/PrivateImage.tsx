import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export function privateFileEndpoint(src: string): string | null {
  const match = src.match(/\/uploads\/([a-zA-Z0-9_.-]+)$/);
  return match ? `/documents/upload/${encodeURIComponent(match[1])}` : null;
}

/** Private images use the existing Family bearer client, never tokens in image URLs. */
export const PrivateImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ src, alt, ...props }) => {
  const token = useAuthStore(state => state.token);
  const [resolved, setResolved] = useState<{ source?: string; token: string | null; url: string } | null>(null);
  const endpoint = src ? privateFileEndpoint(src) : null;
  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController(); let objectUrl: string | undefined;
    apiClient.get(endpoint, { responseType: 'blob', signal: controller.signal }).then(response => {
      if (controller.signal.aborted || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(response.data.type)) return;
      objectUrl = URL.createObjectURL(response.data); setResolved({ source: src, token, url: objectUrl });
    }).catch(() => {});
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [endpoint, src, token]);
  const url = endpoint ? resolved && resolved.source === src && resolved.token === token ? resolved.url : undefined : src;
  return url ? <img {...props} src={url} alt={alt} loading={props.loading || 'lazy'} /> : <span role="img" aria-label={alt} className={props.className}>{alt?.slice(0, 2)}</span>;
};
