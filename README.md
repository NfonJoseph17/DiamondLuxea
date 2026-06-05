# Bar Depot Management

A production-ready monorepo for managing bar and depot operations in Cameroon.

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** NestJS + TypeScript + Prisma
- **Database:** PostgreSQL
- **Auth:** JWT-based with role-based access (MANAGER, CASHIER)
- **Monorepo:** Turborepo + pnpm

## Project Structure

```
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── config/       # Shared tsconfig, eslint, prettier
│   └── ui/           # Shared UI components (optional)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 14+

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

**Backend (apps/api):**

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and set:

- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/bar_depot_db`)
- `JWT_SECRET` — Secret for JWT signing
- `PORT` — API port (default: 3001)
- `FRONTEND_URL` — Frontend URL for CORS (default: http://localhost:3000)

**Frontend (apps/web):**

```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` and set:

- `NEXT_PUBLIC_API_URL` — API base URL (default: http://localhost:3001)

### 3. Create database and run migrations

```bash
# Create PostgreSQL database first (e.g. createdb bar_depot_db)
pnpm db:generate
pnpm db:migrate
```

### 4. Start development servers

```bash
pnpm dev
```

This starts both the API (http://localhost:3001) and web app (http://localhost:3000).

**Important:** Both the API and web app must be running for login to work. If you see "Request failed (500)" or "Failed to proxy" on login, ensure:
1. The API started successfully (check the terminal for `API running on http://localhost:3001`)
2. PostgreSQL is running and `DATABASE_URL` in `apps/api/.env` is correct
3. Migrations and seed have been run: `pnpm db:migrate` and `pnpm db:seed`

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start both apps in development mode |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:push` | Push schema to database (dev) |
| `pnpm db:studio` | Open Prisma Studio |

## Seeding Test Data

```bash
pnpm db:seed
```

This creates test users:

| Email | Password | Role |
|-------|----------|------|
| admin@beverlys.com | *(bcrypt hash in `apps/api/prisma/seed.ts` — change after first login)* | MANAGER |
| cashier@example.com | password123 | CASHIER |

The manager password is not stored in git as plaintext; it is applied when you run `pnpm db:seed` (hash in `seed.ts`). Legacy `manager@example.com` is migrated to `admin@beverlys.com` on seed when needed.

## Frontend Auth Flow

1. Visit http://localhost:3000 — redirects to `/login`
2. Sign in with test credentials above
3. JWT token is stored in localStorage and attached to all API requests
4. Token expiry or 401 responses auto-redirect to `/login`
5. Role-based sidebar navigation shows only permitted pages

## API Endpoints

- `GET /api/health` — Health check
- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Register (manager only)
- `GET /api/auth/me` — Current user profile
- `GET /api/products` — List products
- `POST /api/products` — Create product
- `GET /api/sales` — List sales
- `POST /api/sales` — Create sale
- `GET /api/inventory/balances` — Stock balances
- `GET /api/purchases` — List purchases
- `POST /api/purchases` — Create purchase
- `GET /api/purchases/last-price` — Last price for supplier+product
- `GET /api/suppliers` — List suppliers
- `POST /api/suppliers` — Create supplier
- `GET /api/daily-sessions` — List sessions
- `POST /api/daily-sessions/open` — Open session
- `POST /api/daily-sessions/:id/close` — Close session
- `GET /api/docs` — Swagger API documentation

## Roles

- **MANAGER** — Full access: products, suppliers, purchases, inventory, transfers, adjustments, sessions, users
- **CASHIER** — Dashboard, sales, daily sessions, settings

## Deploying to Render

### API (Backend)

1. **Environment variables** (in Render dashboard):
   - `DATABASE_URL` — Your PostgreSQL connection string (e.g. from Render Postgres)
   - `JWT_SECRET` — Secret for JWT signing
   - `PORT` — Set by Render (usually 10000)
   - `FRONTEND_URL` — Your frontend URL for CORS

2. **Build command:**
   ```bash
   pnpm --filter api build
   ```

3. **Start command:**
   ```bash
   pnpm --filter api start:prod
   ```

4. **Release command** (runs migrations and seed before each deploy):
   ```bash
   cd apps/api && pnpm prisma:migrate:deploy && pnpm prisma:seed
   ```
   The seed is idempotent (safe to run multiple times). It creates users, locations, units, products, and inventory if they don't exist.

5. **If data is missing** (Products, Stock Status, Reports show empty or errors):
   - Run migrations: `pnpm --filter api exec prisma migrate deploy`
   - Run seed: `pnpm --filter api exec prisma db seed`
   - Or from repo root: `pnpm db:migrate` then `pnpm db:seed`
   - Check health: `GET /api/health` returns `database: "connected"` and `seeded: true`

## License

Private
