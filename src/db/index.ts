import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "";

// Neon's HTTP driver in production; plain node-postgres for a local Postgres in development.
// Both expose the same query API, so we type them as one.
export const db = (
  url.includes("neon.tech")
    ? drizzleNeon(neon(url), { schema })
    : drizzlePg(new Pool({ connectionString: url }), { schema })
) as NodePgDatabase<typeof schema>;
