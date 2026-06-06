# Production Deployment Guide

## Railway API Deployment (pnpm monorepo)

The API deploys from the **monorepo root** using pnpm. The repo includes `railway.json` for build/start/pre-deploy commands.

### Railway settings (API service)

| Setting | Value |
|---------|-------|
| **Root Directory** | `.` (or leave empty) — **required** so `/app` contains the repo root |
| **Build Command** | See `railway.json` or set explicitly (see below) |
| **Start Command** | `pnpm --filter api start:prod` |
| **Pre-deploy Command** | `pnpm --filter api prisma:migrate:deploy` |

**Critical:** Root Directory must be `.` or empty. If set to `apps/api`, `/app` will not have the root `package.json` or `pnpm-workspace.yaml`, causing `ERR_PNPM_NO_PKG_MANIFEST`.

### Explicit build command (if not using railway.json)

```
corepack enable && corepack prepare pnpm@9.14.2 --activate && pnpm install --frozen-lockfile && pnpm --filter api prisma:generate && pnpm --filter api build
```

### No “Shell” in the Railway website?

Many projects only show **Deployments**, **Variables**, **Metrics**, **Settings** — there is **no in-browser terminal**. Use the **Railway CLI on your computer** instead (same env as your linked service):

```bash
npm i -g @railway/cli
railway login
cd /path/to/this-repo
railway link   # pick project + **api** service
```

Then either:

```bash
# One-off migrate + seed — needs a *public* DB URL (see below)
bash scripts/railway-seed.sh
```

**If you see `Can't reach database server at postgres.railway.internal`:** your Mac cannot use the private URL. Do one of:

- **Railway → API service → Variables:** add **`DATABASE_PUBLIC_URL`** = Postgres **Connect** tab **public** connection string (then re-run the script), **or**
- **In Terminal before the script:** `export DATABASE_PUBLIC_URL='postgresql://…'` (paste the same public URL), then `bash scripts/railway-seed.sh`.

Or open a **local** shell with Railway’s variables injected:

```bash
railway shell --service api
# then, from repo root inside that shell:
pnpm --filter api exec prisma db seed
```

### Seed (first deploy or when data is missing)

From your machine with CLI linked to **api** (see above), or any shell where `DATABASE_URL` points at production:

```bash
pnpm --filter api exec prisma db seed
```

### Create one user from the terminal (any DB)

From repo root with `DATABASE_URL` pointing at the target Postgres (local or production public URL):

```bash
pnpm --filter api run prisma:create-user -- 'you@example.com' 'your-password' MANAGER 'Full Name'
```

Or from `apps/api`:

```bash
cd apps/api
pnpm prisma:create-user -- 'you@example.com' 'your-password' MANAGER 'Full Name'
```

Uses bcrypt (same as the API). **Upserts** by email (updates password if the user already exists).

---

## Fix: "Internal server error" on Products, Stock Status, Reports

**Root cause:** The production database has not been seeded. Migrations create tables, but the seed creates the required initial data (users, locations, units, products).

### Option A: Render Shell (recommended)

1. Go to [Render Dashboard](https://dashboard.render.com) → your **API** service
2. Click **Shell** (opens a terminal with `DATABASE_URL` already set)
3. Run:
   ```bash
   cd apps/api && pnpm prisma:migrate:deploy && pnpm prisma:seed
   ```
4. If `apps/api` is not in the shell path, run from repo root:
   ```bash
   pnpm --filter api exec prisma migrate deploy
   pnpm --filter api exec prisma db seed
   ```

### Option B: From your machine (with production DATABASE_URL)

1. Copy the **Internal Database URL** from Render Postgres (Dashboard → your Postgres → Connect → Internal)
2. In your project, create `apps/api/.env.production` or set:
   ```bash
   export DATABASE_URL="postgresql://..."
   ```
3. Run:
   ```bash
   cd apps/api
   pnpm prisma:migrate:deploy
   pnpm prisma:seed
   ```

### Option C: Render Release Command (automatic on each deploy)

In Render → API service → **Settings** → **Build & Deploy**:

- **Release Command:** `cd apps/api && pnpm prisma:migrate:deploy && pnpm prisma:seed`

This runs migrations and seed before each deploy. The seed is idempotent (safe to run multiple times).

---

## Database Setup (Required)

Products, Stock Status, and Reports require a migrated and seeded database.

### 1. Migrations (creates/updates tables)

```bash
pnpm --filter api exec prisma migrate deploy
```

### 2. Seed (creates initial data)

```bash
pnpm --filter api exec prisma db seed
```

The seed creates:
- Users (diamondluxea@gmail.com manager, cashier@example.com, sales@example.com)
- Locations (Magasin Principal, Bar Comptoir)
- Units (bottle, crate, carton, etc.)
- Products with prices and inventory
- Supplier

**Important:** `DATABASE_URL` must point to your production database.

### 3. Verify

- Health check: `GET https://your-api.onrender.com/api/health` — should return `database: "connected"` and `seeded: true`
- If login shows **Invalid credentials** for `diamondluxea@gmail.com`, check `authUsers` on that same health response: `managerAccount` should be `true` after `prisma db seed`. If only `legacyManagerExampleCom` is true, run seed once to migrate the manager email and password hash.
- Login with **diamondluxea@gmail.com** (manager password from seed hash in `prisma/seed.ts`) or **cashier@example.com** / `password123`
- Products, Stock Status, and Reports should load

## Railway: Postgres “Data” tab shows empty `users` table

**This does not mean migrations failed.** If you see columns like `full_name`, `email`, `password_hash`, Prisma **already created** the table. **Empty** means there are **zero rows** — usually the **seed never ran against this exact database**, or you are viewing a **different Postgres** than the one your API uses.

1. In Railway, open your **API service** → **Variables** → copy `DATABASE_URL` (or note the host, e.g. `*.proxy.rlwy.net` and database name).
2. Open your **Postgres** plugin → **Connect** / **Variables** and confirm it is the **same** database the API references (same host + db name). If you have **two** Postgres resources, the API might be attached to **A** while the Data tab is open on **B**.
3. Run seed **with that** `DATABASE_URL` (Railway Shell on the **API** service, or `railway run` from a repo linked to the API service — see `scripts/railway-seed.sh`).
4. In the Postgres query editor, run `SELECT COUNT(*) FROM users;` and `SELECT * FROM _prisma_migrations LIMIT 5;` — migrations present + `users` count `0` confirms: **schema OK, run seed**.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Postgres UI: `users` table exists but is empty | Migrations succeeded; run `prisma db seed` on the **same** DB as `DATABASE_URL` on the API service (see section above). |
| "Internal server error" on Products | Run seed (creates units, products) |
| "Internal server error" on Reports | Run seed (creates locations) |
| "No main store location configured" | Run `pnpm prisma:seed` |
| Products/Stock/Reports empty | Run seed |
| Migration fails | Ensure DATABASE_URL is correct; run `prisma migrate status` |
