// ─── Auth Routes ──────────────────────────────────────────────────────────────
// POST /register          — email + password signup
// POST /login             — email + password login
// POST /refresh           — rotate refresh token
// POST /logout            — revoke refresh token
// POST /forgot-password   — send reset email
// POST /reset-password    — consume token + set new password
// POST /verify-email      — consume verification token
// POST /verify-email/resend — resend verification email
// POST /oauth/google      — Google id_token → session tokens
// POST /oauth/apple       — Apple id_token → session tokens

import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { eq, and, gt, isNull, desc } from "drizzle-orm";
import {
  db,
  users,
  refreshTokens,
  subscriptions,
  userPreferences,
  connectedAccounts,
} from "../db/index.js";
import { signAccessToken } from "../lib/jwt.js";
import { sendEmail, verifyEmailTemplate, resetPasswordTemplate } from "../lib/email.js";
import { verifyGoogleIdToken, verifyAppleIdToken } from "../lib/oauth.js";
import { authRateLimit, refreshRateLimit } from "../lib/rate-limit.js";
import { requireAuth } from "../middleware/auth.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSecureToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function issueRefreshToken(userId: string): Promise<string> {
  const raw = generateSecureToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
  return raw;
}

async function getUserSubscriptionTier(userId: string) {
  const [sub] = await db
    .select({ tier: subscriptions.tier, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);
  return sub ?? { tier: "free" as const, status: "active" as const };
}

// ─── Input schemas ────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const googleOAuthSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().max(100).optional(), // user-provided name (Apple sign-in first time)
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const authRoutes: FastifyPluginAsync = async (app) => {
  // ── POST /register ────────────────────────────────────────────────────────
  app.post("/register", { preHandler: authRateLimit() }, async (request, reply) => {
    const parse = registerSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }
    const { email, password, name } = parse.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return reply.code(409).send({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = generateSecureToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Atomic: user row + seed rows must all succeed or all roll back
    const user = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email: normalizedEmail,
          name: name ?? null,
          passwordHash,
          emailVerificationToken: hashToken(verificationToken),
          emailVerificationExpiresAt: verificationExpiresAt,
        })
        .returning({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt });

      if (!newUser) throw new Error("Insert returned no row");

      await Promise.all([
        tx.insert(subscriptions).values({ userId: newUser.id, tier: "free", status: "active" }),
        tx.insert(userPreferences).values({ userId: newUser.id }),
      ]);

      return newUser;
    });

    if (!user) return reply.code(500).send({ error: "Registration failed" });

    // Send verification email (fire-and-forget; don't fail registration if email fails)
    const appUrl = process.env.APP_URL ?? "https://redcoreos.net";
    const verifyLink = `${appUrl}/verify-email?token=${verificationToken}`;
    sendEmail({
      to: normalizedEmail,
      subject: "Verify your redcore-Tuning account",
      html: verifyEmailTemplate(user.name ?? "", verifyLink),
    }).catch((err) => app.log.error({ err }, "Failed to send verification email"));

    const [accessToken, rawRefresh] = await Promise.all([
      signAccessToken(user.id, "user"),
      issueRefreshToken(user.id),
    ]);

    return reply.code(201).send({
      accessToken,
      refreshToken: rawRefresh,
      user: { id: user.id, email: user.email, name: user.name, emailVerified: false, tier: "free" },
    });
  });

  // ── POST /login ───────────────────────────────────────────────────────────
  app.post("/login", { preHandler: authRateLimit() }, async (request, reply) => {
    const parse = loginSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const { email, password } = parse.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || user.deletedAt) {
      // Constant-time comparison to prevent user enumeration via timing
      await bcrypt.hash(password, 12);
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    if (!user.passwordHash) {
      return reply.code(401).send({ error: "This account uses social login. Use Google or Apple to sign in." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const sub = await getUserSubscriptionTier(user.id);
    const [accessToken, rawRefresh] = await Promise.all([
      signAccessToken(user.id, user.role),
      issueRefreshToken(user.id),
    ]);

    return reply.send({
      accessToken,
      refreshToken: rawRefresh,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        role: user.role,
        tier: sub.tier,
        subscriptionStatus: sub.status,
      },
    });
  });

  // ── POST /refresh ─────────────────────────────────────────────────────────
  app.post("/refresh", { preHandler: refreshRateLimit() }, async (request, reply) => {
    const parse = refreshSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const tokenHash = hashToken(parse.data.refreshToken);

    // Atomic revoke: UPDATE with validity conditions prevents race conditions
    // where two concurrent requests with the same token both succeed.
    // If the token was already revoked (or expired), revokedAt/expiresAt
    // conditions fail and nothing is returned — no second session is issued.
    const [record] = await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .returning();

    if (!record) {
      return reply.code(401).send({ error: "Invalid or expired refresh token" });
    }

    const [user] = await db
      .select({ id: users.id, role: users.role, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, record.userId))
      .limit(1);

    if (!user || user.deletedAt) {
      return reply.code(401).send({ error: "Account not found" });
    }

    const [accessToken, rawRefresh] = await Promise.all([
      signAccessToken(user.id, user.role),
      issueRefreshToken(user.id),
    ]);

    return reply.send({ accessToken, refreshToken: rawRefresh });
  });

  // ── POST /logout ──────────────────────────────────────────────────────────
  app.post("/logout", { preHandler: requireAuth }, async (request, reply) => {
    const parse = refreshSchema.safeParse(request.body);
    if (parse.success) {
      const tokenHash = hashToken(parse.data.refreshToken);
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            eq(refreshTokens.userId, request.userId),
          ),
        );
    }
    return reply.send({ ok: true });
  });

  // ── POST /forgot-password ─────────────────────────────────────────────────
  app.post("/forgot-password", { preHandler: authRateLimit(5) }, async (request, reply) => {
    const parse = forgotPasswordSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const email = parse.data.email.toLowerCase().trim();

    // Always return success to prevent email enumeration
    const [user] = await db
      .select({ id: users.id, name: users.name, passwordHash: users.passwordHash, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user && !user.deletedAt && user.passwordHash) {
      const rawToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db
        .update(users)
        .set({
          passwordResetToken: hashToken(rawToken),
          passwordResetExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      const appUrl = process.env.APP_URL ?? "https://redcoreos.net";
      const resetLink = `${appUrl}/reset-password?token=${rawToken}`;
      sendEmail({
        to: email,
        subject: "Reset your redcore-Tuning password",
        html: resetPasswordTemplate(user.name ?? "", resetLink),
      }).catch((err) => app.log.error({ err }, "Failed to send reset password email"));
    }

    return reply.send({ ok: true, message: "If an account with that email exists, a reset link has been sent." });
  });

  // ── POST /reset-password ──────────────────────────────────────────────────
  app.post("/reset-password", { preHandler: authRateLimit() }, async (request, reply) => {
    const parse = resetPasswordSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }
    const { token, password } = parse.data;
    const tokenHash = hashToken(token);

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, tokenHash),
          gt(users.passwordResetExpiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!user) {
      return reply.code(400).send({ error: "Reset token is invalid or has expired" });
    }

    const newHash = await bcrypt.hash(password, 12);
    await db
      .update(users)
      .set({
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Revoke all existing refresh tokens for security
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, user.id));

    return reply.send({ ok: true, message: "Password has been reset. Please log in with your new password." });
  });

  // ── POST /verify-email ────────────────────────────────────────────────────
  app.post("/verify-email", async (request, reply) => {
    const parse = verifyEmailSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const tokenHash = hashToken(parse.data.token);

    const [user] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(
        and(
          eq(users.emailVerificationToken, tokenHash),
          gt(users.emailVerificationExpiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!user) {
      return reply.code(400).send({ error: "Verification link is invalid or has expired" });
    }

    if (user.emailVerified) {
      return reply.send({ ok: true, message: "Email is already verified" });
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return reply.send({ ok: true, message: "Email verified successfully" });
  });

  // ── POST /verify-email/resend ─────────────────────────────────────────────
  app.post("/verify-email/resend", { preHandler: [requireAuth, authRateLimit(3)] }, async (request, reply) => {
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user) return reply.code(404).send({ error: "User not found" });
    if (user.emailVerified) return reply.send({ ok: true, message: "Email is already verified" });

    const rawToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db
      .update(users)
      .set({
        emailVerificationToken: hashToken(rawToken),
        emailVerificationExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const appUrl = process.env.APP_URL ?? "https://redcoreos.net";
    const verifyLink = `${appUrl}/verify-email?token=${rawToken}`;
    sendEmail({
      to: user.email,
      subject: "Verify your redcore-Tuning email",
      html: verifyEmailTemplate(user.name ?? "", verifyLink),
    }).catch((err) => app.log.error({ err }, "Failed to send verification email"));

    return reply.send({ ok: true, message: "Verification email sent" });
  });

  // ── POST /oauth/google ────────────────────────────────────────────────────
  app.post("/oauth/google", { preHandler: authRateLimit() }, async (request, reply) => {
    const parse = googleOAuthSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    let profile;
    try {
      profile = await verifyGoogleIdToken(parse.data.idToken);
    } catch (err) {
      app.log.warn({ err }, "Google OAuth token verification failed");
      return reply.code(401).send({ error: "Invalid Google token" });
    }

    return oauthSignIn({ profile, provider: "google", providedName: parse.data.name, reply });
  });

  // ── POST /oauth/apple ─────────────────────────────────────────────────────
  app.post("/oauth/apple", { preHandler: authRateLimit() }, async (request, reply) => {
    const parse = googleOAuthSchema.safeParse(request.body); // same shape
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    let profile;
    try {
      profile = await verifyAppleIdToken(parse.data.idToken);
    } catch (err) {
      app.log.warn({ err }, "Apple OAuth token verification failed");
      return reply.code(401).send({ error: "Invalid Apple token" });
    }

    return oauthSignIn({ profile, provider: "apple", providedName: parse.data.name, reply });
  });

  // ─── OAuth shared sign-in logic ────────────────────────────────────────────
  async function oauthSignIn({
    profile,
    provider,
    providedName,
    reply,
  }: {
    profile: import("../lib/oauth.js").OAuthProfile;
    provider: "google" | "apple";
    providedName?: string;
    reply: import("fastify").FastifyReply;
  }) {
    const normalizedEmail = profile.email?.toLowerCase().trim();
    const fallbackAppleEmail = `apple-${profile.id}@privaterelay.redcore.invalid`;
    const accountEmail = normalizedEmail ?? fallbackAppleEmail;

    // 1. Check if this OAuth account is already linked
    const [existingLink] = await db
      .select({ userId: connectedAccounts.userId })
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.provider, provider),
          eq(connectedAccounts.providerUserId, profile.id),
        ),
      )
      .limit(1);

    if (existingLink) {
      // Existing OAuth user — log in
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, existingLink.userId))
        .limit(1);

      if (!user || user.deletedAt) {
        return reply.code(401).send({ error: "Account not found or deleted" });
      }

      const sub = await getUserSubscriptionTier(user.id);
      const [accessToken, rawRefresh] = await Promise.all([
        signAccessToken(user.id, user.role),
        issueRefreshToken(user.id),
      ]);

      return reply.send({
        accessToken,
        refreshToken: rawRefresh,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          role: user.role,
          tier: sub.tier,
          subscriptionStatus: sub.status,
        },
      });
    }

    // 2. Check if an account with this email already exists (link to it)
    const [existingUser] = normalizedEmail
      ? await db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1)
      : [];

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      if (existingUser.deletedAt) {
        return reply.code(401).send({ error: "Account has been deleted" });
      }
      userId = existingUser.id;
    } else {
      // 3. Create new account
      const [newUser] = await db
        .insert(users)
        .values({
          email: accountEmail,
          name: providedName ?? profile.name,
          avatarUrl: profile.avatarUrl ?? null,
          oauthProvider: provider,
          oauthId: profile.id,
          emailVerified: profile.emailVerified,
        })
        .returning({ id: users.id });

      if (!newUser) return reply.code(500).send({ error: "Failed to create account" });
      userId = newUser.id;
      isNewUser = true;

      await Promise.all([
        db.insert(subscriptions).values({ userId, tier: "free", status: "active" }),
        db.insert(userPreferences).values({ userId }),
      ]);
    }

    // Link OAuth provider to the account (upsert)
    await db
      .insert(connectedAccounts)
      .values({
        userId,
        provider,
        providerUserId: profile.id,
        providerEmail: normalizedEmail ?? null,
      })
      .onConflictDoNothing();

    const [finalUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!finalUser) return reply.code(500).send({ error: "Failed to retrieve account" });

    const sub = await getUserSubscriptionTier(userId);
    const [accessToken, rawRefresh] = await Promise.all([
      signAccessToken(finalUser.id, finalUser.role),
      issueRefreshToken(finalUser.id),
    ]);

    return reply.code(isNewUser ? 201 : 200).send({
      accessToken,
      refreshToken: rawRefresh,
      isNewUser,
      user: {
        id: finalUser.id,
        email: finalUser.email,
        name: finalUser.name,
        avatarUrl: finalUser.avatarUrl,
        emailVerified: finalUser.emailVerified,
        role: finalUser.role,
        tier: sub.tier,
        subscriptionStatus: sub.status,
      },
    });
  }
};
