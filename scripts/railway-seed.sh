#!/usr/bin/env bash
# Seed production database via Railway CLI or a local public DATABASE_URL.
#
# Prerequisites: railway login, railway link (to API service)
#
# Your Mac cannot reach postgres.railway.internal. Use ONE of:
#   A) Railway → API service → Variables → add DATABASE_PUBLIC_URL (Postgres "Connect" public URL)
#   B) Before running: export DATABASE_PUBLIC_URL='postgresql://...'  (paste public URL from Railway)
#
set -e

cd "$(dirname "$0")/.."

echo "=== Railway production seed ==="

# 1. Check Railway auth
if ! railway whoami &>/dev/null; then
  echo "Error: Not logged in. Run: railway login"
  exit 1
fi
echo "✓ Logged in"

# 2. Check link
if ! railway status &>/dev/null; then
  echo "Error: Project not linked. Run: railway link (select project + API service)"
  exit 1
fi
echo "✓ Project linked"

is_internal_url() {
  case "${1:-}" in
  *railway.internal*) return 0 ;;
  *) return 1 ;;
  esac
}

run_migrate_and_seed() {
  echo ""
  echo "Running migrations (if any pending)..."
  pnpm --filter api exec prisma migrate deploy

  echo ""
  echo "Running seed..."
  pnpm --filter api exec prisma db seed
}

# 3a. Host override: public URL in this terminal (recommended when API has no DATABASE_PUBLIC_URL)
if [ -n "${DATABASE_PUBLIC_URL:-}" ]; then
  export DATABASE_URL="$DATABASE_PUBLIC_URL"
  if is_internal_url "$DATABASE_URL"; then
    echo "Error: DATABASE_PUBLIC_URL still looks internal (contains railway.internal). Paste the *public* URL from Railway Postgres → Connect."
    exit 1
  fi
  echo "✓ Using DATABASE_PUBLIC_URL from your shell (reachable from this Mac)."
  run_migrate_and_seed
  echo ""
  echo "=== Seed complete ==="
  exit 0
fi

# 3b. railway run: merge API service env; prefer DATABASE_PUBLIC_URL if set on Railway
echo ""
railway run bash -c '
set -e
export DATABASE_URL="${DATABASE_PUBLIC_URL:-$DATABASE_URL}"
if echo "$DATABASE_URL" | grep -q "railway.internal"; then
  echo ""
  echo "ERROR: Prisma is using Railway internal Postgres (\`...railway.internal\`), which this computer cannot reach."
  echo ""
  echo "Fix — pick one:"
  echo "  1) Railway → Postgres → Connect → copy the *public* connection string."
  echo "     Railway → API service → Variables → Add variable:"
  echo "       Name:  DATABASE_PUBLIC_URL"
  echo "       Value: (paste that public URL)"
  echo "     Then run this script again."
  echo ""
  echo "  2) In this Mac terminal (same folder), run:"
  echo "       export DATABASE_PUBLIC_URL=\"postgresql://...\"   # paste public URL"
  echo "       bash scripts/railway-seed.sh"
  echo ""
  exit 1
fi
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma db seed
'

echo ""
echo "=== Seed complete ==="
