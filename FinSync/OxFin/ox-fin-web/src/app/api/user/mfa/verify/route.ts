import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { verify } from 'otplib';
import { query } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { secret, code } = await req.json();

        if (!secret || !code) {
            return NextResponse.json({ error: 'Secret and code are required' }, { status: 400 });
        }

        const isValid = await verify({ token: code, secret });

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        const userId = session.user.id;

        // Save secret to database and enable MFA
        await query(
            'UPDATE users SET two_factor_enabled = TRUE, two_factor_secret = $1 WHERE id = $2',
            [secret, userId]
        );

        return NextResponse.json({ message: 'MFA enabled successfully' });
    } catch (error) {
        console.error('MFA Verify error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
