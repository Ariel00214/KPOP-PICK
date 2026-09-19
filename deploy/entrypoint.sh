#!/bin/sh
set -eu

npx prisma db push --skip-generate

node --import tsx prisma/seed.ts

exec npm start
