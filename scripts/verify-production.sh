#!/usr/bin/env bash

set -Eeuo pipefail

required_files=(
  "package.json"
  "package-lock.json"
  "next.config.ts"
  "Dockerfile"
  ".dockerignore"
  "docker-compose.yml"
  "vitest.config.ts"
  ".github/workflows/ci.yml"
  "src/app/error.tsx"
  "src/app/loading.tsx"
  "src/app/not-found.tsx"
  "src/app/api/system/readiness/route.ts"
  "src/app/api/system/version/route.ts"
  "src/lib/monitoring/logger.ts"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "Missing production file: ${file}" >&2
    exit 1
  fi
done

echo "Production file verification passed."
