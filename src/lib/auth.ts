import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "renter", input: true },
      phone: { type: "string", required: false, input: true },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Only "owner" or "renter" can be chosen at sign-up.
        before: async (user) => ({
          data: { ...user, role: (user as { role?: string }).role === "owner" ? "owner" : "renter" },
        }),
      },
    },
    session: {
      create: {
        // Suspended accounts can't log in.
        before: async (session) => {
          const u = await db.query.user.findFirst({
            where: eq(schema.user.id, session.userId),
            columns: { suspendedAt: true },
          });
          if (u?.suspendedAt) {
            throw new APIError("FORBIDDEN", {
              message: "This account has been suspended. Contact Oopa support if you think this is a mistake.",
            });
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
