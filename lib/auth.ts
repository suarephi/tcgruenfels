import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getUserByUsername, getUserById } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await getUserByUsername(credentials.username);
        if (!user) {
          return null;
        }

        const isValid = await compare(credentials.password, user.password_hash);
        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.username,
          isAdmin: user.is_admin === true,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
      }
      // Refresh admin status on every request to catch updates
      if (trigger === "update" || token.id) {
        const dbUser = await getUserById(parseInt(token.id as string));
        if (dbUser) {
          token.isAdmin = dbUser.is_admin === true;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
