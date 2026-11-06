#!/usr/bin/env bash
set -euo pipefail

cd /root/buses
git pull --ff-only
npm ci
npm run build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
sudo nginx -t
sudo systemctl reload nginx
curl --fail --silent --show-error http://127.0.0.1:3009/api/v1/health
