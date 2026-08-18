import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

/** Server-component/route guard — redirects to /login when there's no valid session. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/dashboard");
  return session;
}
