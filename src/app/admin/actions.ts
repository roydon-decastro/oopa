"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { property, session, user } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

const SUSPENDED = "Owner account suspended";

function refresh() {
  for (const p of ["/admin", "/admin/users", "/admin/listings", "/listings", "/"]) revalidatePath(p);
}

export async function suspendUser(userId: string): Promise<{ error?: string } | void> {
  const { user: me } = await requireAdmin();
  if (userId === me.id) return { error: "You can't suspend your own account." };
  const now = new Date();
  await db.update(user).set({ suspendedAt: now }).where(eq(user.id, userId));
  // Log them out everywhere and hide their listings.
  await db.delete(session).where(eq(session.userId, userId));
  await db.update(property).set({ removedAt: now, removedReason: SUSPENDED })
    .where(and(eq(property.ownerId, userId), isNull(property.removedAt)));
  refresh();
}

export async function unsuspendUser(userId: string) {
  await requireAdmin();
  await db.update(user).set({ suspendedAt: null }).where(eq(user.id, userId));
  // Bring back only the listings that were hidden because of the suspension.
  await db.update(property).set({ removedAt: null, removedReason: null })
    .where(and(eq(property.ownerId, userId), eq(property.removedReason, SUSPENDED)));
  refresh();
}

export async function removeListing(id: string, reason: string) {
  await requireAdmin();
  const why = reason.trim().slice(0, 300) || "Doesn't follow Oopa's listing rules";
  await db.update(property).set({ removedAt: new Date(), removedReason: why }).where(eq(property.id, id));
  refresh();
  revalidatePath(`/listings/${id}`);
}

export async function restoreListing(id: string) {
  await requireAdmin();
  await db.update(property).set({ removedAt: null, removedReason: null }).where(eq(property.id, id));
  refresh();
  revalidatePath(`/listings/${id}`);
}
