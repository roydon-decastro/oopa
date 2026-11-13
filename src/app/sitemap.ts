import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { property } from "@/db/schema";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ["", "/listings", "/owners", "/terms", "/privacy"].map((p) => ({
    url: `${SITE_URL}${p}`, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.6,
  }));
  if (!process.env.DATABASE_URL) return fixed;
  const listings = await db.select({ id: property.id, updatedAt: property.updatedAt, buildingId: property.buildingId })
    .from(property).where(eq(property.status, "active"));
  const buildings = [...new Set(listings.map((l) => l.buildingId).filter(Boolean))] as string[];
  return [
    ...fixed,
    ...listings.map((l) => ({ url: `${SITE_URL}/listings/${l.id}`, lastModified: l.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...buildings.map((id) => ({ url: `${SITE_URL}/buildings/${id}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
