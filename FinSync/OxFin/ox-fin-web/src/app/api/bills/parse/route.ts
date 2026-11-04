import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    return Response.json({ code: 'BILL_PARSER_NOT_CONFIGURED', error: 'Bill parsing is not connected.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
