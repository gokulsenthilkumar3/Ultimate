import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// This legacy endpoint has no persisted deposit/withdraw implementation.
async function unavailable() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    return Response.json({ code: 'WALLET_OPERATION_NOT_CONFIGURED', error: 'Use the connected wallet service. This operation is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
export const GET = unavailable;
export const POST = unavailable;
