import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "./db";

function hasRealValue(value: string | undefined): value is string {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized) return false;
  return !/^your-|^change-me|placeholder|example/i.test(normalized);
}

const googleConfigured =
  hasRealValue(process.env.GOOGLE_CLIENT_ID ?? webEnv("GOOGLE_CLIENT_ID")) &&
  hasRealValue(process.env.GOOGLE_CLIENT_SECRET ?? webEnv("GOOGLE_CLIENT_SECRET"));

console.log("[auth-config]", {
  googleConfigured,
  googleClientIdLength:
    (process.env.GOOGLE_CLIENT_ID ?? webEnv("GOOGLE_CLIENT_ID"))?.length ?? 0,
  googleClientSecretLength:
    (process.env.GOOGLE_CLIENT_SECRET ?? webEnv("GOOGLE_CLIENT_SECRET"))?.length ?? 0,
  nextauthUrl: process.env.NEXTAUTH_URL ?? null,
});

function webEnv(key: string): string | undefined {
  try {
    const filePath = path.resolve(process.cwd(), "../../../../.env.local");
    if (!fs.existsSync(filePath)) return undefined;
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const currentKey = trimmed.slice(0, separator).trim();
      if (currentKey !== key) continue;
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  debug: true,
  logger: {
    error(error) {
      console.error("[auth][error]", error);
    },
    warn(...message) {
      console.warn("[auth][warn]", ...message);
    },
    debug(...message) {
      console.debug("[auth][debug]", ...message);
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/setup",
  },
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID ?? webEnv("GOOGLE_CLIENT_ID")!,
            clientSecret:
              process.env.GOOGLE_CLIENT_SECRET ?? webEnv("GOOGLE_CLIENT_SECRET")!,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;
        const action = credentials.action as string | undefined;

        if (action === "register") {
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) return null;

          const passwordHash = await bcrypt.hash(password, 12);
          const user = await prisma.user.create({
            data: {
              email,
              name: (credentials.name as string) || email.split("@")[0],
              passwordHash,
            },
          });

          return { id: user.id, email: user.email, name: user.name };
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.iat = Math.floor(Date.now() / 1000);
      }
      // Invalidate JWT if password was changed after token was issued
      if (token.id && token.iat) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { passwordChangedAt: true },
        });
        if (dbUser?.passwordChangedAt) {
          const changedAtSec = Math.floor(dbUser.passwordChangedAt.getTime() / 1000);
          if (changedAtSec > (token.iat as number)) {
            return { ...token, id: undefined };
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
