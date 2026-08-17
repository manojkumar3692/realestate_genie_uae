"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { organizations, users } from "@/db/schema";
import { newId } from "@/lib/id";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "./session";
import { requireAdmin } from "./requireSession";
import { logAudit } from "@/lib/audit";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function signupAction(formData: FormData): Promise<void> {
  const orgName = String(formData.get("orgName") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  if (!orgName || !name || !email || !password) fail("/signup", "Please fill in every field.");
  if (password.length < 8) fail("/signup", "Password must be at least 8 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("/signup", "Enter a valid email address.");

  const existing = await db.query.users.findFirst({ where: eq(users.normalizedEmail, email) });
  if (existing) fail("/signup", "An account with that email already exists — try logging in instead.");

  const orgId = newId("org");
  await db.insert(organizations).values({ id: orgId, name: orgName });

  const userId = newId("user");
  const passwordHash = await hashPassword(password);
  await db.insert(users).values({
    id: userId,
    orgId,
    email,
    normalizedEmail: email,
    passwordHash,
    name,
    role: "admin",
  });

  await logAudit({ orgId, userId, action: "org.created", entityType: "organization", entityId: orgId });

  const token = await createSessionToken({ sub: userId, orgId, role: "admin", email, name });
  await setSessionCookie(token);
  redirect("/");
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await db.query.users.findFirst({ where: eq(users.normalizedEmail, email) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    fail("/login", "Invalid email or password.");
  }

  const token = await createSessionToken({
    sub: user!.id,
    orgId: user!.orgId,
    role: user!.role,
    email: user!.email,
    name: user!.name,
  });
  await setSessionCookie(token);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

export async function inviteTeammateAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const orgId = session.orgId;
  const invitedBy = session.sub;

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "user") === "admin" ? "admin" : "user";

  if (!name || !email || password.length < 8) fail("/settings/team", "Fill in name, a valid email, and an 8+ character password.");

  const existing = await db.query.users.findFirst({ where: eq(users.normalizedEmail, email) });
  if (existing) fail("/settings/team", "That email is already registered.");

  const userId = newId("user");
  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ id: userId, orgId, email, normalizedEmail: email, passwordHash, name, role });
  await logAudit({ orgId, userId: invitedBy, action: "user.invited", entityType: "user", entityId: userId });
  redirect("/settings/team");
}
