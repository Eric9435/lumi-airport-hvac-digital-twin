#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/workspaces/lumi-airport-hvac-digital-twin"

handle_error() {
  local exit_code=$?
  local line_number="${1:-unknown}"

  echo
  echo "============================================================"
  echo "PART 10 RESUME FAILED"
  echo "Line: ${line_number}"
  echo "Exit code: ${exit_code}"
  echo "============================================================"

  exit "${exit_code}"
}

trap 'handle_error $LINENO' ERR

cd "$PROJECT_ROOT"

echo "============================================================"
echo "RESUMING PART 10 — PRODUCTION HARDENING"
echo "============================================================"

required_files=(
  "package.json"
  "vitest.config.ts"
  "next.config.ts"
  "Dockerfile"
  ".dockerignore"
  "docker-compose.yml"
  ".github/workflows/ci.yml"
  ".github/workflows/dependency-review.yml"
  "src/app/error.tsx"
  "src/app/loading.tsx"
  "src/app/not-found.tsx"
  "src/app/api/system/readiness/route.ts"
  "src/app/api/system/version/route.ts"
  "src/lib/monitoring/logger.ts"
  "tests/unit/lumi-command.service.test.ts"
  "tests/unit/energy-engine.test.ts"
  "tests/unit/scenario-engine.test.ts"
  "tests/integration/health-route.test.ts"
)

echo "Checking generated files..."

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "ERROR: Required Part 10 file is missing: $file" >&2
    exit 1
  fi
done

echo "All required Part 10 files are present."

echo
echo "Formatting supported files..."

format_files=(
  "package.json"
  "vitest.config.ts"
  "next.config.ts"
  "src/app/error.tsx"
  "src/app/loading.tsx"
  "src/app/not-found.tsx"
  "src/app/api/system/readiness/route.ts"
  "src/app/api/system/version/route.ts"
  "src/lib/monitoring/logger.ts"
  "tests/unit/lumi-command.service.test.ts"
  "tests/unit/energy-engine.test.ts"
  "tests/unit/scenario-engine.test.ts"
  "tests/integration/health-route.test.ts"
  ".github/workflows/ci.yml"
  ".github/workflows/dependency-review.yml"
  "docker-compose.yml"
  "docs/deployment/DEPLOYMENT.md"
  "docs/operations/RUNBOOK.md"
)

npx prettier \
  --write \
  --ignore-unknown \
  "${format_files[@]}"

echo
echo "Verifying production files..."

if [[ -x scripts/verify-production.sh ]]; then
  ./scripts/verify-production.sh
else
  echo "verify-production.sh is unavailable; required files were checked directly."
fi

echo
echo "Running TypeScript validation..."

npm run typecheck

echo
echo "Running ESLint..."

npm run lint

echo
echo "Running automated tests..."

npm run test

echo
echo "Running production build..."

npm run build

echo
echo "Checking npm audit status..."

npm audit --audit-level=high || {
  echo
  echo "WARNING: npm audit reported high-severity issues."
  echo "Review them manually before production deployment."
  echo "The script will not run npm audit fix --force automatically."
}

echo
echo "Staging Part 10 files..."

git add \
  package.json \
  package-lock.json \
  vitest.config.ts \
  next.config.ts \
  Dockerfile \
  .dockerignore \
  docker-compose.yml \
  .gitignore \
  .github/workflows/ci.yml \
  .github/workflows/dependency-review.yml \
  scripts/10-production-hardening-ci-and-docker.sh \
  scripts/10-resume-production-hardening.sh \
  scripts/verify-production.sh \
  src/app/error.tsx \
  src/app/loading.tsx \
  src/app/not-found.tsx \
  src/app/api/system/readiness/route.ts \
  src/app/api/system/version/route.ts \
  src/lib/monitoring/logger.ts \
  tests/unit/lumi-command.service.test.ts \
  tests/unit/energy-engine.test.ts \
  tests/unit/scenario-engine.test.ts \
  tests/integration/health-route.test.ts \
  docs/deployment/DEPLOYMENT.md \
  docs/operations/RUNBOOK.md

echo
echo "Reviewing staged changes..."

git status --short

if git diff --cached --quiet; then
  echo "No new Part 10 changes are available to commit."
else
  git commit \
    -m "chore: add production hardening tests CI and Docker deployment"

  git push
fi

echo
echo "============================================================"
echo "PART 10 COMPLETED SUCCESSFULLY"
echo "PRODUCTION HARDENING, TESTING AND CI/CD ARE READY"
echo "============================================================"
echo
echo "Available commands:"
echo "  npm run dev"
echo "  npm run test"
echo "  npm run test:coverage"
echo "  npm run validate"
echo "  npm run build"
echo "  npm run start"
echo "  npm run docker:build"
echo "  npm run docker:run"
echo
echo "Health endpoints:"
echo "  /api/health"
echo "  /api/system/readiness"
echo "  /api/system/version"
echo
