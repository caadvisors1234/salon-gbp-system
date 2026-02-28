#!/usr/bin/env bash
set -euo pipefail

# Frontend deploy script for salon-gbp production
# Usage: cd /opt/salon-gbp && bash deploy/deploy-frontend.sh
#
# What it does:
#   1. git pull latest code
#   2. Rebuild the web container (multi-stage: npm build -> nginx)
#   3. Replace the web container (brief downtime during swap)

cd "$(dirname "$0")/.."

echo "==> Pulling latest code..."
git pull origin master

echo "==> Rebuilding web container..."
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d --build --no-deps web

echo "==> Waiting for health check..."
sleep 5
if docker compose --env-file .env -f deploy/docker-compose.prod.yml ps web | grep -q "healthy\|Up"; then
  echo "==> Deploy complete!"
else
  echo "==> WARNING: web container may not be healthy. Check with:"
  echo "    docker compose --env-file .env -f deploy/docker-compose.prod.yml ps web"
  echo "    docker compose --env-file .env -f deploy/docker-compose.prod.yml logs web --tail 20"
fi
