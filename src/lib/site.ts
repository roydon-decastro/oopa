export const SITE_NAME = "Oopa";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
/** Shown on the legal pages. Set NEXT_PUBLIC_CONTACT_EMAIL in Vercel. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "[contact email: set NEXT_PUBLIC_CONTACT_EMAIL]";
export const LEGAL_UPDATED = "November 14, 2026";
