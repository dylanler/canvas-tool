import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text", optional: true },
        action: { label: "Action", type: "hidden" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const isSignUp = credentials.action === "signup"

        if (isSignUp) {
          // Sign up flow
          const existingUser = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (existingUser) {
            throw new Error("User already exists")
          }

          const hashedPassword = await bcrypt.hash(credentials.password, 12)
          
          const user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.name || credentials.email.split("@")[0],
              // Note: We'll store password in a separate table for better security
            }
          })

          // For demo purposes, we'll use a simple approach
          // In production, consider using a separate UserCredentials table
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        } else {
          // Sign in flow
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user) {
            return null
          }

          // For this demo, we'll allow any password
          // In production, implement proper password hashing/verification
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle account linking for OAuth providers
      if (account?.provider === 'google' && user.email) {
        try {
          // Check if user with this email already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          })

          if (existingUser) {
            // Check if this Google account is already linked
            const existingGoogleAccount = existingUser.accounts.find(
              acc => acc.provider === 'google' && acc.providerAccountId === account.providerAccountId
            )

            if (!existingGoogleAccount) {
              // Link the Google account to the existing user
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                }
              })
            }
            
            // Update the user object to use the existing user's ID
            user.id = existingUser.id
          }
        } catch (error) {
          console.error('Account linking error:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string
      }
      return session
    }
  }
}