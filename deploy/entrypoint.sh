#!/bin/sh
set -eu

npx prisma db push --skip-generate

if [ "${KPOP_SEED_DEMO:-true}" = "true" ] && [ ! -f /app/data/.seeded ]; then
  node --import tsx prisma/seed.ts
  touch /app/data/.seeded
fi

exec npm start
