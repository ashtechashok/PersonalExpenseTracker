import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

export type SessionUser = {
  id: string;
  email: string;
  isAdmin: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  currency: string;
  locale: string;
  timezone: string;
  cardVisibility: Record<string, boolean>;
};

// Every call re-reads the user row live rather than trusting the JWT payload,
// so an admin approving/rejecting/promoting someone takes effect on their
// very next request — no stale "approved" or "admin" claim can linger in an
// already-issued token.
async function getRawSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySessionToken(token) : null;
  if (!claims) return null;

  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) return null;

  let cardVisibility: Record<string, boolean> = {};
  try {
    cardVisibility = JSON.parse(user.cardVisibility);
  } catch {
    // ignore malformed stored JSON — treat as "nothing hidden"
  }

  return {
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    status: user.status,
    currency: user.currency,
    locale: user.locale,
    timezone: user.timezone,
    cardVisibility,
  };
}

/** The current user, or null if not logged in or not yet approved. */
export async function getSession(): Promise<SessionUser | null> {
  const user = await getRawSession();
  return user && user.status === "APPROVED" ? user : null;
}

/** Use in pages/actions that require a fully approved user. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getRawSession();
  if (!user) redirect("/login");
  if (user.status !== "APPROVED") redirect("/pending");
  return user;
}

/** Use in pages/actions restricted to admins. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}

/** Use only by the /pending page itself — doesn't redirect approved-away. */
export async function requirePendingOrRejected(): Promise<SessionUser> {
  const user = await getRawSession();
  if (!user) redirect("/login");
  if (user.status === "APPROVED") redirect("/dashboard");
  return user;
}
