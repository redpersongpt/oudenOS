import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type {
  FastifyRequest,
  FastifyReply,
  preHandlerHookHandler,
} from 'fastify';

// ---------------------------------------------------------------------------
// Type augmentation
// ---------------------------------------------------------------------------

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userRole: string;
    adminId?: string;
  }
}

// ---------------------------------------------------------------------------
// Secret
// ---------------------------------------------------------------------------

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  role: string;
  type: 'access';
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  type: 'refresh';
}

export async function signAccessToken(
  userId: string,
  role: string = 'user',
): Promise<string> {
  return new SignJWT({ role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .setIssuer('redcore-os')
    .sign(getSecret());
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .setIssuer('redcore-os')
    .sign(getSecret());
}

export async function verifyToken(
  token: string,
): Promise<{ userId: string; role?: string; type: string }> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: 'redcore-os',
  });

  if (!payload.sub) {
    throw new Error('Token missing subject');
  }

  return {
    userId: payload.sub,
    role: (payload as Record<string, unknown>).role as string | undefined,
    type: (payload as Record<string, unknown>).type as string,
  };
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export const requireAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: { code: 'AUTH_001', message: 'Missing or invalid authorization header' },
    });
  }

  const token = header.slice(7);

  try {
    const decoded = await verifyToken(token);

    if (decoded.type !== 'access') {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_002', message: 'Invalid token type' },
      });
    }

    request.userId = decoded.userId;
    request.userRole = decoded.role ?? 'user';
  } catch {
    return reply.status(401).send({
      success: false,
      error: { code: 'AUTH_003', message: 'Token expired or invalid' },
    });
  }
};
