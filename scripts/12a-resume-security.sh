#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/workspaces/lumi-airport-hvac-digital-twin"

handle_error() {
  local exit_code=$?
  local line_number="${1:-unknown}"

  echo
  echo "============================================================"
  echo "PART 12A RESUME FAILED"
  echo "Line: ${line_number}"
  echo "Exit code: ${exit_code}"
  echo "============================================================"

  exit "${exit_code}"
}

trap 'handle_error $LINENO' ERR

cd "${PROJECT_ROOT}"

echo "============================================================"
echo "RESUMING PART 12A — SECURITY VALIDATION"
echo "============================================================"

required_files=(
  "src/types/security.ts"
  "src/lib/security/permissions.ts"
  "src/lib/security/password-policy.ts"
  "src/lib/security/session.ts"
  "src/lib/security/api-auth.ts"
  "src/lib/audit/security-audit.ts"
  "src/lib/rate-limit/rate-limiter.ts"
  "src/services/security-user.service.ts"
  "src/services/security-audit.service.ts"
  "src/app/api/auth/login/route.ts"
  "src/app/api/auth/logout/route.ts"
  "src/app/api/auth/session/route.ts"
  "src/app/api/admin/users/route.ts"
  "src/app/api/admin/users/role/route.ts"
  "src/app/api/admin/security/route.ts"
  "src/app/api/audit/security/route.ts"
  "src/app/api/system/metrics/route.ts"
  "src/components/admin/security-admin-panel.tsx"
  "tests/unit/security/permissions.test.ts"
  "tests/unit/security/password-policy.test.ts"
  "tests/unit/security/rate-limiter.test.ts"
  "docs/security/ENTERPRISE_SECURITY.md"
)

echo "Checking generated security files..."

for file in "${required_files[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "ERROR: Missing required file: ${file}" >&2
    exit 1
  fi
done

echo "All required Part 12A files are present."

format_files=(
  "src/types/security.ts"
  "src/lib/security/permissions.ts"
  "src/lib/security/password-policy.ts"
  "src/lib/security/session.ts"
  "src/lib/security/api-auth.ts"
  "src/lib/audit/security-audit.ts"
  "src/lib/rate-limit/rate-limiter.ts"
  "src/services/security-user.service.ts"
  "src/services/security-audit.service.ts"
  "src/app/api/auth/login/route.ts"
  "src/app/api/auth/logout/route.ts"
  "src/app/api/auth/session/route.ts"
  "src/app/api/admin/users/route.ts"
  "src/app/api/admin/users/role/route.ts"
  "src/app/api/admin/security/route.ts"
  "src/app/api/audit/security/route.ts"
  "src/app/api/system/metrics/route.ts"
  "src/components/admin/security-admin-panel.tsx"
  "src/components/dashboard/plant-dashboard.tsx"
  "tests/unit/security/permissions.test.ts"
  "tests/unit/security/password-policy.test.ts"
  "tests/unit/security/rate-limiter.test.ts"
  "docs/security/ENTERPRISE_SECURITY.md"
  ".env.example"
)

echo "Formatting Part 12A files..."

npx prettier \
  --write \
  --ignore-unknown \
  "${format_files[@]}"

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
echo "Staging Part 12A files..."

git add \
  package.json \
  package-lock.json \
  .env.example \
  scripts/12a-enterprise-security-rbac-and-audit.sh \
  scripts/12a-resume-security.sh \
  src/types/security.ts \
  src/lib/security/permissions.ts \
  src/lib/security/password-policy.ts \
  src/lib/security/session.ts \
  src/lib/security/api-auth.ts \
  src/lib/audit/security-audit.ts \
  src/lib/rate-limit/rate-limiter.ts \
  src/services/security-user.service.ts \
  src/services/security-audit.service.ts \
  src/app/api/auth/login/route.ts \
  src/app/api/auth/logout/route.ts \
  src/app/api/auth/session/route.ts \
  src/app/api/admin/users/route.ts \
  src/app/api/admin/users/role/route.ts \
  src/app/api/admin/security/route.ts \
  src/app/api/audit/security/route.ts \
  src/app/api/system/metrics/route.ts \
  src/components/admin/security-admin-panel.tsx \
  src/components/dashboard/plant-dashboard.tsx \
  tests/unit/security/permissions.test.ts \
  tests/unit/security/password-policy.test.ts \
  tests/unit/security/rate-limiter.test.ts \
  docs/security/ENTERPRISE_SECURITY.md

echo
echo "Git status:"

git status --short

if git diff --cached --quiet; then
  echo "No new Part 12A changes to commit."
else
  git commit \
    -m "feat: add enterprise security RBAC sessions and audit logging"

  git push
fi

echo
echo "============================================================"
echo "PART 12A COMPLETED SUCCESSFULLY"
echo "ENTERPRISE SECURITY FOUNDATION IS READY"
echo "============================================================"
echo
echo "Authentication APIs:"
echo "  POST /api/auth/login"
echo "  POST /api/auth/logout"
echo "  GET  /api/auth/session"
echo
echo "Administration APIs:"
echo "  GET   /api/admin/users"
echo "  PATCH /api/admin/users/role"
echo "  GET   /api/admin/security"
echo "  GET   /api/audit/security"
echo "  GET   /api/system/metrics"
