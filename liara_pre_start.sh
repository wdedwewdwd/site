#!/bin/sh
# Runs on Liara before `npm start` (environment variables are available here).
set -e
echo "Applying database migrations..."
npx prisma migrate deploy
echo "Migrations applied."
