import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE = "session";
// "Remember me" checked: a long-lived session so you don't get logged out
// easily. Unchecked: a short-lived one, and the cookie itself is set
// without a maxAge (a browser-session cookie, gone once the browser fully
// closes) — see loginAction in app/login/actions.ts.
export const SESSION_MAX_AGE_REMEMBERED_SECONDS = 60 * 60 * 24 * 90; // 90 days
export const SESSION_MAX_AGE_DEFAULT_SECONDS = 60 * 60 * 24; // 1 day

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a long random string in your .env file (see .env.example)."
    );
  }
  return new TextEncoder().encode(secret);
}

// The token only ever carries a user id — email/role/status can change after
// the token was issued, so every request re-reads them live from the DB
// (see lib/session.ts) instead of trusting a snapshot baked into the JWT.
export async function createSessionToken(userId: string, rememberMe: boolean): Promise<string> {
  const maxAge = rememberMe ? SESSION_MAX_AGE_REMEMBERED_SECONDS : SESSION_MAX_AGE_DEFAULT_SECONDS;
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
