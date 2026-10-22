// Close only this run's localhost preview. Playwright's Windows taskkill /T
// can fail when process-tree enumeration is restricted in a managed workspace.
export default async function teardown() {
  const token = process.env.GROWTHTRACK_SMOKE_TOKEN;
  if (!token) return;
  const baseURL = `http://127.0.0.1:${process.env.GROWTHTRACK_SMOKE_PORT || 5177}`;
  try {
    const response = await fetch(`${baseURL}/__milestone-smoke/shutdown`, {
      method: 'POST', headers: { 'x-smoke-token': token }, signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 204) throw new Error(`Smoke preview shutdown failed (${response.status}).`);
  } catch (error) {
    if (error.cause?.code !== 'ECONNREFUSED') throw error;
  }
}
