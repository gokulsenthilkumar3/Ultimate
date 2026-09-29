export function sharedServerUrl(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('GROWTHTRACK_SERVER_URL must be a trusted HTTPS application URL without credentials, query parameters, or fragments.');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}
