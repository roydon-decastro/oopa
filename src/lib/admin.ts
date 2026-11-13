import "server-only";
import { notFound } from "next/navigation";
import { getSession } from "./session";

// Site admins are listed by email in the ADMIN_EMAILS environment variable (comma-separated).
export function isAdmin(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

// Non-admins get a plain 404 so the admin area isn't advertised.
export async function requireAdmin() {
  const session = await getSession();
  if (!session || !isAdmin(session.user.email)) notFound();
  return session;
}
