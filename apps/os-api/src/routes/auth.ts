import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  subscriptions,
  userPreferences,
  refreshTokens,
  connectedAccounts,
} from '../db/index.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  requireAuth,
} from '../middleware/auth.js';
import { authRateLimit } from '../lib/rate-limit.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../lib/email.js';
import { verifyGoogleToken, verifyAppleToken } from '../lib/oauth.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(320),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const oauthGoogleSchema = z.object({
  idToken: z.string().min(1),
});

const oauthAppleSchema = z.object({
  idToken: z.string().min(1),
  displayName: z.string().max(100).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function sanitizeUser(
  user: typeof users.$inferSelect,
): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  const rateLimiter = authRateLimit(15, 60_000);

  // -----------------------------------------------------------------------
  // POST /register
  // -----------------------------------------------------------------------
  app.post('/register', { preHandler: [rateLimiter] }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { email, password, displayName } = parsed.data;

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(409).send({
        success: false,
        error: { code: 'AUTH_010', message: 'Email already registered' },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();

    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        displayName: displayName ?? null,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60_000),
      })
      .returning();

    if (!newUser) {
      return reply.status(500).send({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to create account' },
      });
    }

    await db.insert(subscriptions).values({ userId: newUser.id, tier: 'free', status: 'active' });
    await db.insert(userPreferences).values({ userId: newUser.id });

    const accessToken = await signAccessToken(newUser.id, newUser.role);
    const refreshTokenValue = await signRefreshToken(newUser.id);
    const refreshHash = await hashToken(refreshTokenValue);

    await db.insert(refreshTokens).values({
      userId: newUser.id,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    });

    sendVerificationEmail(newUser.email, verificationToken, displayName).catch((err) => {
      console.error('[email] Verification email failed:', err);
    });

    return reply.status(201).send({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenValue,
        user: sanitizeUser(newUser),
      },
    });
  });

  // -----------------------------------------------------------------------
  // POST /login
  // -----------------------------------------------------------------------
  app.post('/login', { preHandler: [rateLimiter] }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !user.passwordHash) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_011', message: 'Invalid email or password' },
      });
    }

    if (user.deletedAt) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_012', message: 'Account has been deactivated' },
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_011', message: 'Invalid email or password' },
      });
    }

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    const accessToken = await signAccessToken(user.id, user.role);
    const refreshTokenValue = await signRefreshToken(user.id);
    const refreshHash = await hashToken(refreshTokenValue);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenValue,
        user: {
          ...sanitizeUser(user),
          subscription: sub ? { tier: sub.tier, status: sub.status } : null,
        },
      },
    });
  });

  // -----------------------------------------------------------------------
  // POST /refresh
  // -----------------------------------------------------------------------
  app.post('/refresh', { preHandler: [rateLimiter] }, async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed' },
      });
    }

    const { refreshToken: incomingToken } = parsed.data;

    let decoded: { userId: string; type: string };
    try {
      decoded = await verifyToken(incomingToken);
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_020', message: 'Invalid refresh token' },
      });
    }

    if (decoded.type !== 'refresh') {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_021', message: 'Invalid token type' },
      });
    }

    const tokenHash = await hashToken(incomingToken);

    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      .limit(1);

    if (!storedToken) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_022', message: 'Refresh token not found or revoked' },
      });
    }

    // Revoke old token
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, storedToken.id));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user || user.deletedAt) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_023', message: 'User not found' },
      });
    }

    const newAccessToken = await signAccessToken(user.id, user.role);
    const newRefreshTokenValue = await signRefreshToken(user.id);
    const newRefreshHash = await hashToken(newRefreshTokenValue);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: newRefreshHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    });

    return reply.send({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshTokenValue },
    });
  });

  // -----------------------------------------------------------------------
  // POST /logout
  // -----------------------------------------------------------------------
  app.post('/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed' },
      });
    }

    const tokenHash = await hashToken(parsed.data.refreshToken);

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.userId, request.userId),
          isNull(refreshTokens.revokedAt),
        ),
      );

    return reply.send({ success: true, data: { message: 'Logged out' } });
  });

  // -----------------------------------------------------------------------
  // POST /forgot-password
  // -----------------------------------------------------------------------
  app.post('/forgot-password', { preHandler: [rateLimiter] }, async (request, reply) => {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed' },
      });
    }

    // Always return 200 to prevent user enumeration
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email.toLowerCase()))
      .limit(1);

    if (user && !user.deletedAt) {
      const resetToken = uuidv4();

      await db
        .update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpires: new Date(Date.now() + 60 * 60_000),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      sendPasswordResetEmail(user.email, resetToken, user.displayName ?? undefined).catch(
        (err) => {
          console.error('[email] Password reset email failed:', err);
        },
      );
    }

    return reply.send({
      success: true,
      data: { message: 'If that email exists, a reset link has been sent' },
    });
  });

  // -----------------------------------------------------------------------
  // POST /reset-password
  // -----------------------------------------------------------------------
  app.post('/reset-password', { preHandler: [rateLimiter] }, async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { token, newPassword } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      return reply.status(400).send({
        success: false,
        error: { code: 'AUTH_030', message: 'Invalid or expired reset token' },
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Revoke all refresh tokens for this user
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, user.id), isNull(refreshTokens.revokedAt)));

    return reply.send({
      success: true,
      data: { message: 'Password reset successful' },
    });
  });

  // -----------------------------------------------------------------------
  // GET /verify-email
  // -----------------------------------------------------------------------
  app.get('/verify-email', async (request, reply) => {
    const { token } = request.query as { token?: string };

    if (!token) {
      return reply.status(400).send({
        success: false,
        error: { code: 'AUTH_040', message: 'Missing verification token' },
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token))
      .limit(1);

    if (
      !user ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      return reply.status(400).send({
        success: false,
        error: { code: 'AUTH_041', message: 'Invalid or expired verification token' },
      });
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    sendWelcomeEmail(user.email, user.displayName ?? undefined).catch((err) => {
      console.error('[email] Welcome email failed:', err);
    });

    return reply.send({
      success: true,
      data: { message: 'Email verified successfully' },
    });
  });

  // -----------------------------------------------------------------------
  // POST /oauth/google
  // -----------------------------------------------------------------------
  app.post('/oauth/google', { preHandler: [rateLimiter] }, async (request, reply) => {
    const parsed = oauthGoogleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed' },
      });
    }

    let googleUser: Awaited<ReturnType<typeof verifyGoogleToken>>;
    try {
      googleUser = await verifyGoogleToken(parsed.data.idToken);
    } catch (err) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_050', message: 'Invalid Google token' },
      });
    }

    // Check if connected account exists
    const [existing] = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.provider, 'google'),
          eq(connectedAccounts.providerUserId, googleUser.id),
        ),
      )
      .limit(1);

    let userId: string;
    let isNewUser = false;

    if (existing) {
      userId = existing.userId;
    } else {
      // Check if user exists by email
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, googleUser.email.toLowerCase()))
        .limit(1);

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            email: googleUser.email.toLowerCase(),
            displayName: googleUser.name,
            avatarUrl: googleUser.avatarUrl,
            emailVerified: true,
          })
          .returning();

        if (!newUser) {
          return reply.status(500).send({
            success: false,
            error: { code: 'SRV_001', message: 'Failed to create account' },
          });
        }

        userId = newUser.id;
        isNewUser = true;

        await db.insert(subscriptions).values({ userId, tier: 'free', status: 'active' });
        await db.insert(userPreferences).values({ userId });
      }

      // Link connected account
      await db.insert(connectedAccounts).values({
        userId,
        provider: 'google',
        providerUserId: googleUser.id,
        providerEmail: googleUser.email,
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || user.deletedAt) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_051', message: 'Account unavailable' },
      });
    }

    const accessToken = await signAccessToken(user.id, user.role);
    const refreshTokenValue = await signRefreshToken(user.id);
    const refreshHash = await hashToken(refreshTokenValue);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenValue,
        user: sanitizeUser(user),
        isNewUser,
      },
    });
  });

  // -----------------------------------------------------------------------
  // POST /oauth/apple
  // -----------------------------------------------------------------------
  app.post('/oauth/apple', { preHandler: [rateLimiter] }, async (request, reply) => {
    const parsed = oauthAppleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed' },
      });
    }

    let appleUser: Awaited<ReturnType<typeof verifyAppleToken>>;
    try {
      appleUser = await verifyAppleToken(parsed.data.idToken);
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_060', message: 'Invalid Apple token' },
      });
    }

    const [existing] = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.provider, 'apple'),
          eq(connectedAccounts.providerUserId, appleUser.id),
        ),
      )
      .limit(1);

    let userId: string;
    let isNewUser = false;

    if (existing) {
      userId = existing.userId;
    } else {
      if (appleUser.email) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, appleUser.email.toLowerCase()))
          .limit(1);

        if (existingUser) {
          userId = existingUser.id;
        } else {
          const [newUser] = await db
            .insert(users)
            .values({
              email: appleUser.email.toLowerCase(),
              displayName: parsed.data.displayName ?? appleUser.name,
              emailVerified: true,
            })
            .returning();

          if (!newUser) {
            return reply.status(500).send({
              success: false,
              error: { code: 'SRV_001', message: 'Failed to create account' },
            });
          }

          userId = newUser.id;
          isNewUser = true;

          await db.insert(subscriptions).values({ userId, tier: 'free', status: 'active' });
          await db.insert(userPreferences).values({ userId });
        }
      } else {
        // Apple sometimes doesn't provide email — create with placeholder
        const placeholderEmail = `apple_${appleUser.id}@private.redcore-os.com`;
        const [newUser] = await db
          .insert(users)
          .values({
            email: placeholderEmail,
            displayName: parsed.data.displayName ?? appleUser.name,
            emailVerified: false,
          })
          .returning();

        if (!newUser) {
          return reply.status(500).send({
            success: false,
            error: { code: 'SRV_001', message: 'Failed to create account' },
          });
        }

        userId = newUser.id;
        isNewUser = true;

        await db.insert(subscriptions).values({ userId, tier: 'free', status: 'active' });
        await db.insert(userPreferences).values({ userId });
      }

      await db.insert(connectedAccounts).values({
        userId,
        provider: 'apple',
        providerUserId: appleUser.id,
        providerEmail: appleUser.email,
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || user.deletedAt) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_061', message: 'Account unavailable' },
      });
    }

    const accessToken = await signAccessToken(user.id, user.role);
    const refreshTokenValue = await signRefreshToken(user.id);
    const refreshHash = await hashToken(refreshTokenValue);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenValue,
        user: sanitizeUser(user),
        isNewUser,
      },
    });
  });
}
