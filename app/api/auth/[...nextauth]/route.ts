import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SessionUserWithId = { id?: string };
type TokenWithId = { id?: string };
type SafeUser = {
  id: string;
  email: string;
  name?: string | null;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          return null;
        }
        // remove password before returning
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword as SafeUser;
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  callbacks: {
    async jwt({ token, user }) {
      if (user && "id" in user) {
        (token as TokenWithId).id = (user as SessionUserWithId).id;
      }
      return token;
    },
    async session({ session, token }) {
      const typedSession = session as typeof session & {
        user: SessionUserWithId;
      };
      typedSession.user.id = (token as TokenWithId).id;
      return typedSession;
    },
  }

  
};

const handler = NextAuth(authOptions);
export {handler as GET,handler as POST};