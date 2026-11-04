import { firebaseAdmin } from '@/lib/server/firebaseAdmin';
import { directoryInput, firebaseDirectory, serviceAuthorized } from '@/lib/server/customerDirectory.mjs';

export const runtime = 'nodejs';
let active = 0;
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!serviceAuthorized(request.headers.get('authorization'), process.env.FINSYNC_ADMIN_SERVICE_TOKEN)) return Response.json({ code: 'SERVICE_AUTH_REQUIRED' }, { status: 401, headers });
  let input;
  try { input = directoryInput(request.url); } catch { return Response.json({ code: 'INVALID_FILTER' }, { status: 400, headers }); }
  if (active >= 2) return Response.json({ code: 'DIRECTORY_BUSY' }, { status: 503, headers });
  active++;
  try {
    return Response.json(await firebaseDirectory(firebaseAdmin().auth, input), { headers });
  } catch { return Response.json({ code: 'DIRECTORY_UNAVAILABLE' }, { status: 503, headers }); }
  finally { active--; }
}
