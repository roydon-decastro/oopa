import { and, eq, isNull, type SQL } from "drizzle-orm";
import { property } from "@/db/schema";

// A listing renters can see: published by the owner and not taken down by an admin.
export const publicListing = (): SQL => and(eq(property.status, "active"), isNull(property.removedAt))!;
export const isPublicListing = (p: { status: string; removedAt: Date | null }) => p.status === "active" && !p.removedAt;
