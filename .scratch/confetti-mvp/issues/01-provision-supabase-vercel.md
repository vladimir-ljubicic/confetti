# 01 — Provision Supabase + Vercel, env vars

**What to build:** Infrastructure exists so the app can run locally and in prod: a Supabase project (Postgres + a storage bucket for photos) and a Vercel project deploying this repo. All connection env vars set in `.env.local` and on Vercel.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] Supabase project created, storage bucket for photos exists
- [x] Vercel project linked to the repo; scaffold deploys successfully
- [x] Supabase URL + anon key + service role key set locally and on Vercel
