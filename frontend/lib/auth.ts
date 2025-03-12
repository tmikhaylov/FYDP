// lib/auth.ts
import { AuthOptions, DefaultSession, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "../prisma/client";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}

export const authConfig: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET!,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",  // Make sure JWT is the session strategy
    maxAge: 60 * 60 * 40, // 4 hours (in seconds)
    updateAge: 60 * 60 * 10,  // Refresh every 30 minutes (in seconds)
  },
  jwt: {
    maxAge: 60 * 60 * 40, // JWT also lasts for 4 hours
  },
  callbacks: {
    jwt: async ({ token }) => {
      if (!token.email) return token;

      try {
        const db_user = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true }, // Select only ID to reduce DB calls
        });

        if (db_user) {
          token.id = db_user.id;
        }
      } catch (error) {
        console.error("JWT Callback Error:", error);
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
      }
      return session;
    },
  },
};


export async function getUser() {
  return await getServerSession(authConfig);
}
