import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { property } from "@/db/schema";

/** Loads the listing behind a private application link, or null if the link is invalid or the listing is gone. */
export async function listingForToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const p = await db.query.property.findFirst({
    where: eq(property.applyToken, token),
    with: { building: true, owner: { columns: { id: true, name: true, email: true, suspendedAt: true } } },
  });
  if (!p || p.removedAt || p.status === "archived" || p.owner.suspendedAt) return null;
  return p;
}

