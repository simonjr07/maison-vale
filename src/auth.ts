import NextAuth, { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@/generated/prisma/enums";

import { authenticateCredentialsWithDatabase } from "@/server/auth/authenticate-db";

function getRequestSource(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unavailable";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const identity = await authenticateCredentialsWithDatabase(
          credentials,
          getRequestSource(request),
        );

        return identity ? { id: identity.id, role: identity.role } : null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub && token.role) {
        session.user.id = token.sub;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  logger: {
    error(error) {
      const errorType = error instanceof AuthError ? error.type : "UnknownAuthError";
      if (errorType !== "CredentialsSignin") {
        console.error(`Authentication error: ${errorType}`);
      }
    },
    warn(code) {
      console.warn(`Authentication warning: ${code}`);
    },
    debug() {},
  },
});
