#!/bin/sh
set -eu

if [ -z "${POSTGRES_DATABASE_URL:-}" ]; then
  echo "POSTGRES_DATABASE_URL is required for persistent production data." >&2
  exit 1
fi

export DATABASE_URL="$POSTGRES_DATABASE_URL"
npx prisma migrate deploy

node --import tsx prisma/seed.ts

exec npm start
