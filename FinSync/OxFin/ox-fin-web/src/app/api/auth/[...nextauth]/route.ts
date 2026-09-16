import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { verify } from 'otplib';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                mfaCode: { label: "MFA Code", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const email = credentials.email.trim().toLowerCase();

                const result = await query(
                    'SELECT id, name, email, password_hash, two_factor_enabled, two_factor_secret, failed_login_attempts, lockout_until FROM users WHERE email = $1',
                    [email]
                );

                if (result.rows.length === 0) return null;
                const user = result.rows[0];

                // Check for account lockout
                if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
                    throw new Error('ACCOUNT_LOCKED');
                }

                if (!user.password_hash) return null;

                const isValid = await bcrypt.compare(credentials.password, user.password_hash);

                if (!isValid) {
                    // Increment failed attempts
                    const newAttempts = (user.failed_login_attempts || 0) + 1;
                    let lockoutUntil = null;
                    if (newAttempts >= 5) {
                        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
                    }

                    await query(
                        'UPDATE users SET failed_login_attempts = $1, lockout_until = $2 WHERE id = $3',
                        [newAttempts, lockoutUntil, user.id]
                    );

                    throw new Error('INVALID_CREDENTIALS');
                }

                // MFA Check
                if (user.two_factor_enabled) {
                    if (!credentials.mfaCode) {
                        throw new Error('MFA_REQUIRED');
                    }

                    const isMfaValid = await verify({
                        token: credentials.mfaCode,
                        secret: user.two_factor_secret
                    });

                    if (!isMfaValid) {
                        throw new Error('INVALID_MFA_CODE');
                    }
                }

                // Success - reset failed attempts
                await query(
                    'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = $1',
                    [user.id]
                );

                return {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.email,
                } as any;
            }
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
        }),
    ],
    pages: {
        signIn: "/",
        error: "/",
    },
    session: {
        strategy: "jwt",
        maxAge: 8 * 60 * 60, // 8 hours
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
