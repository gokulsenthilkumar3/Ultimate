import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string
            role: string
            email_verified?: Date | null
            two_factor_enabled: boolean
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        role: string
        two_factor_enabled: boolean
        password_hash?: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        two_factor_enabled: boolean
    }
}
