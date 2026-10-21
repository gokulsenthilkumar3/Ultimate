import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

const isDatabaseUnavailable = (error: unknown): boolean => {
    if (error instanceof AggregateError) {
        return error.errors.some(isDatabaseUnavailable);
    }

    if (!error || typeof error !== 'object') return false;

    const code = 'code' in error ? error.code : undefined;
    return [
        'ECONNREFUSED',
        'ECONNRESET',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'ENOTFOUND',
        'ETIMEDOUT',
        '57P03',
    ].includes(code as string);
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email: rawEmail, password, name } = body;
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : rawEmail;

        // 1. Basic Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // 2. Password Policy Check (Min 12 chars)
        if (password.length < 12) {
            return NextResponse.json(
                { error: 'Password must be at least 12 characters long' },
                { status: 400 }
            );
        }

        // 3. Check if user already exists
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            );
        }

        // 4. Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Insert User
        // We insert into 'users' table.
        // Note: 'password_history' logic can be added here or in a separate step if strictly required now.
        // For MVP registration:
        const insertResult = await query(
            `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
            [name || email.split('@')[0], email, hashedPassword]
        );

        const newUser = insertResult.rows[0];

        // 6. Return Success (excluding password)
        return NextResponse.json(
            {
                message: 'User created successfully',
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role
                }
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Registration Error:', error);
        if (isDatabaseUnavailable(error)) {
            return NextResponse.json(
                { error: 'Registration is temporarily unavailable. Please try again in a moment.' },
                { status: 503 }
            );
        }
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
