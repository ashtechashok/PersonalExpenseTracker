"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  verifyPassword,
  hashPassword,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_MEDIUMS,
  DEFAULT_ACCOUNT_ROLES,
} from "@/lib/constants";
import { serializeAllowedAccountTypes } from "@/lib/mediums";

export type LoginState = { error?: string };

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  if (user.status === "PENDING") {
    return { error: "Your account is awaiting admin approval." };
  }
  if (user.status === "REJECTED") {
    return { error: "Your account request was declined. Contact the site admin." };
  }

  const token = await createSessionToken(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

export type SignupState = { error?: string; success?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signupAction(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords don't match." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists." };

  const userCount = await prisma.user.count();
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      // A fresh deployment has no admin to approve anyone, so the very first
      // signup becomes an approved admin automatically. Every signup after
      // that needs an existing admin's approval before they can log in.
      isAdmin: userCount === 0,
      status: userCount === 0 ? "APPROVED" : "PENDING",
      // Every user gets their own editable copy of the same starting
      // category list — see the Categories tab on /settings.
      categories: {
        create: [
          ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ name, type: "EXPENSE" as const })),
          ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ name, type: "INCOME" as const })),
        ],
      },
      // Every user gets their own editable copy of the same starting
      // medium list too — see the Mediums tab on /settings.
      mediums: {
        create: DEFAULT_MEDIUMS.map(({ name, allowedAccountTypes }) => ({
          name,
          allowedAccountTypes: serializeAllowedAccountTypes([...allowedAccountTypes]),
        })),
      },
      // Every user gets their own editable copy of the same starting
      // account-role list too — see the Account Roles tab on /settings.
      accountRoles: {
        create: DEFAULT_ACCOUNT_ROLES.map((name) => ({ name })),
      },
    },
  });

  return { success: true };
}
