import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateSecret, generateURI } from 'otplib';
import { query } from '@/lib/db';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const email = session.user.email;

        // Generate a new secret
        const secret = generateSecret();
        const otpauth = generateURI({ issuer: 'OxFin', label: email!, secret });

        // Store secret temporarily (or just return it for the user to verify)
        // We only save it to the DB once they verify a code.

        return NextResponse.json({
            secret,
            otpauth
        });
    } catch (error) {
        console.error('MFA Setup error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
