#!/usr/bin/env bash

set -euo pipefail

required_files=(
  "package.json"
  "tsconfig.json"
  "src/app/page.tsx"
  "src/app/api/health/route.ts"
  "src/lib/config/app-config.ts"
  "src/lib/config/env.ts"
  ".env.example"
  ".devcontainer/devcontainer.json"
)

for file in "${required_files[@]}"; do
  if [ ! -e "$file" ]; then
    echo "Missing required file: $file" >&2
    exit 1
  fi
done

echo "Project structure verification passed."
