import { createRemoteJWKSet, jwtVerify } from 'jose';

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

const googleJwksUrl = new URL(
  'https://www.googleapis.com/oauth2/v3/certs',
);
const googleJwks = createRemoteJWKSet(googleJwksUrl);

export interface GoogleUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export async function verifyGoogleToken(
  idToken: string,
): Promise<GoogleUser> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is required');
  }

  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  });

  if (!payload.sub || !payload.email) {
    throw new Error('Google token missing required claims');
  }

  return {
    id: payload.sub,
    email: payload.email as string,
    name: (payload.name as string) ?? null,
    avatarUrl: (payload.picture as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Apple
// ---------------------------------------------------------------------------

const appleJwksUrl = new URL('https://appleid.apple.com/auth/keys');
const appleJwks = createRemoteJWKSet(appleJwksUrl);

export interface AppleUser {
  id: string;
  email: string | null;
  name: string | null;
}

export async function verifyAppleToken(
  idToken: string,
): Promise<AppleUser> {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('APPLE_CLIENT_ID environment variable is required');
  }

  const { payload } = await jwtVerify(idToken, appleJwks, {
    issuer: 'https://appleid.apple.com',
    audience: clientId,
  });

  if (!payload.sub) {
    throw new Error('Apple token missing subject');
  }

  return {
    id: payload.sub,
    email: (payload.email as string) ?? null,
    name: null,
  };
}
