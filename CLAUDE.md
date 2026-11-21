# Oopa: notes for Claude

## Hosting: Vercel now, a VPS later

The owner uses Vercel for development and prototyping and plans to move Oopa to their own VPS.
Keep the app portable, and tell the owner about anything that would make that move harder.

- Don't add Vercel-only features without flagging them: Edge Config, Vercel KV, Vercel Cron, Edge runtime-only
  code, ISR that depends on Vercel's cache, or `@vercel/*` packages. Prefer standard Node.js and Next.js APIs.
- Photos: `src/lib/storage.ts` uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, else the local `.uploads/` folder.
  On the VPS, move photos to S3-compatible storage (e.g. Cloudflare R2) and copy the existing Blob photos with a
  one-time script that also rewrites the photo URLs in the database.
- Database: Neon over HTTP when `DATABASE_URL` contains `neon.tech`, plain node-postgres otherwise (`src/db/index.ts`).
- Environment variables must be copied to the VPS unchanged; `BETTER_AUTH_SECRET` especially, or every session ends.
- Database changes: the owner runs SQL by hand in the Neon SQL Editor. Ship an idempotent
  `drizzle/neon-manual-update-*.sql` with every schema change and tell them to run it before merging.
- When the move happens: offer a Dockerfile or systemd + Nginx/Caddy setup with step-by-step instructions,
  backups for Postgres, and the photo migration script.
