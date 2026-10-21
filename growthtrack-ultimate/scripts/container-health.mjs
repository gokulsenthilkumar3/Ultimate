try {
  const response = await fetch(`http://127.0.0.1:${process.env.PORT || 3001}/api/health`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4000) });
  const status = await response.json();
  if (!response.ok || status.status !== 'online' || status.database?.status !== 'CONNECTED') process.exitCode = 1;
} catch { process.exitCode = 1; }
