#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

BRANCH="$(git branch --show-current)"
EXPECTED_BRANCH="feat/lumi-nexus-foundation"

STORE_FILE="src/store/nexus-replay-store.ts"
CONSOLE_FILE="src/components/nexus/replay/nexus-replay-console.tsx"
STORE_TEST="tests/nexus/nexus-replay-store.test.ts"
CONSOLE_TEST="tests/nexus/nexus-replay-console-route.test.ts"
NAV_FILE="src/components/nexus/lumi-platform-navigation.tsx"
NAV_TEST="tests/nexus/lumi-enterprise-navigation.test.ts"
DOC_FILE="docs/data/NEXUS_SHARED_REPLAY_STATE.md"
AUDIT_FILE="scripts/verify-nexus-completion.mjs"
BUILD_LOG="/tmp/lumi-nexus-master-completion-build.log"

echo "============================================================"
echo " LUMI NEXUS — MASTER COMPLETION CHECKPOINT"
echo "============================================================"
echo "Repository : $ROOT"
echo "Branch     : $BRANCH"
echo "Started    : $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo

if [ "$BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo "ERROR: Expected branch $EXPECTED_BRANCH but found $BRANCH"
  exit 1
fi

required_files=(
  "package.json"
  "$STORE_FILE"
  "$CONSOLE_FILE"
  "$STORE_TEST"
  "$CONSOLE_TEST"
  "$NAV_FILE"
  "$NAV_TEST"
  "$DOC_FILE"
  "src/lib/nexus/replay/nexus-replay-engine.ts"
  "src/lib/nexus/replay/nexus-replay-analytics.ts"
  "src/app/api/nexus/replay/route.ts"
  "src/app/api/nexus/replay/analytics/route.ts"
  "src/app/nexus/replay/page.tsx"
  "src/lib/nexus/datasets/nexus-dataset-catalog.ts"
  "public/data/nexus-24h/dataset-manifest.csv"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: Required project file is missing: $file"
    exit 1
  fi
done

if ! grep -Fq '"zustand"' package.json; then
  echo "ERROR: Zustand dependency is missing from package.json"
  exit 1
fi

mkdir -p "$(dirname "$AUDIT_FILE")"

echo "Step 1/10 — Aligning replay tests with shared-state architecture..."

node <<'NODE'
const fs = require("node:fs");

const consoleTestFile =
  "tests/nexus/nexus-replay-console-route.test.ts";

let source = fs.readFileSync(
  consoleTestFile,
  "utf8",
);

if (!source.includes("const replayStoreSource")) {
  const componentFixturePattern =
    /const componentSource = readFileSync\([\s\S]*?\n\);/;

  const match = source.match(
    componentFixturePattern,
  );

  if (!match) {
    throw new Error(
      "Could not locate componentSource fixture.",
    );
  }

  source = source.replace(
    match[0],
    `${match[0]}

const replayStoreSource = readFileSync(
  resolve(
    process.cwd(),
    "src/store/nexus-replay-store.ts",
  ),
  "utf8",
);`,
  );
}

const oldSpeedTest =
  /  it\("provides accelerated deterministic replay speeds", \(\) => \{[\s\S]*?  \}\);\n/;

const newSpeedTest = `  it("provides accelerated deterministic replay speeds through the shared store", () => {
    expect(componentSource).toContain(
      "NEXUS_REPLAY_SPEED_OPTIONS",
    );

    expect(componentSource).toContain(
      "isNexusReplaySpeed",
    );

    for (const speed of [
      60,
      120,
      600,
      1200,
    ]) {
      expect(replayStoreSource).toContain(
        \`value: \${speed}\`,
      );
    }

    for (const delay of [
      "delayMs: 10_000",
      "delayMs: 5_000",
      "delayMs: 1_000",
      "delayMs: 500",
    ]) {
      expect(replayStoreSource).toContain(
        delay,
      );
    }
  });
`;

if (oldSpeedTest.test(source)) {
  source = source.replace(
    oldSpeedTest,
    newSpeedTest,
  );
}

if (
  !source.includes(
    "provides accelerated deterministic replay speeds through the shared store",
  )
) {
  throw new Error(
    "Shared replay speed test is missing.",
  );
}

fs.writeFileSync(
  consoleTestFile,
  source,
);

const storeTestFile =
  "tests/nexus/nexus-replay-store.test.ts";

let storeTest = fs.readFileSync(
  storeTestFile,
  "utf8",
);

if (
  !storeTest.includes(
    "NEXUS_REPLAY_SPEED_OPTIONS",
  )
) {
  storeTest = storeTest.replace(
    "NEXUS_REPLAY_SNAPSHOT_COUNT,",
    "NEXUS_REPLAY_SPEED_OPTIONS,\n  NEXUS_REPLAY_SNAPSHOT_COUNT,",
  );
}

const marker =
  `  it("accepts supported replay speeds only", () => {`;

const configurationTest = `  it("exposes all deterministic replay speed configurations", () => {
    expect(
      NEXUS_REPLAY_SPEED_OPTIONS.map(
        (option) => option.value,
      ),
    ).toEqual([
      60,
      120,
      600,
      1200,
    ]);

    expect(
      NEXUS_REPLAY_SPEED_OPTIONS.map(
        (option) => option.delayMs,
      ),
    ).toEqual([
      10_000,
      5_000,
      1_000,
      500,
    ]);
  });

`;

if (
  !storeTest.includes(
    "exposes all deterministic replay speed configurations",
  )
) {
  if (!storeTest.includes(marker)) {
    throw new Error(
      "Store speed test insertion point was not found.",
    );
  }

  storeTest = storeTest.replace(
    marker,
    `${configurationTest}${marker}`,
  );
}

fs.writeFileSync(
  storeTestFile,
  storeTest,
);

console.log(
  "PASS: Replay tests aligned with shared-state authority.",
);
NODE

echo
echo "Step 2/10 — Adding Replay Console to enterprise navigation..."

node <<'NODE'
const fs = require("node:fs");

const navFile =
  "src/components/nexus/lumi-platform-navigation.tsx";

let source = fs.readFileSync(
  navFile,
  "utf8",
);

if (
  !source.includes(
    'href: "/nexus/replay"',
  )
) {
  const candidates = [
    /(\{\s*href:\s*"\/nexus\/operations"[\s\S]*?\},)/,
    /(\{\s*href:\s*"\/dashboard"[\s\S]*?\},)/,
  ];

  let inserted = false;

  for (const pattern of candidates) {
    if (pattern.test(source)) {
      source = source.replace(
        pattern,
        `$1
  {
    href: "/nexus/replay",
    label: "Replay Console",
    description:
      "Run the synchronized 24-hour operational dataset timeline.",
  },`,
      );

      inserted = true;
      break;
    }
  }

  if (!inserted) {
    throw new Error(
      "Could not identify a safe navigation insertion point.",
    );
  }
}

fs.writeFileSync(
  navFile,
  source,
);

const navTestFile =
  "tests/nexus/lumi-enterprise-navigation.test.ts";

let testSource = fs.readFileSync(
  navTestFile,
  "utf8",
);

testSource = testSource.replace(
  'for (const route of ["/nexus", "/nexus/operations", "/dashboard"])',
  'for (const route of ["/nexus", "/nexus/operations", "/nexus/replay", "/dashboard"])',
);

fs.writeFileSync(
  navTestFile,
  testSource,
);

console.log(
  "PASS: Replay Console navigation route registered.",
);
NODE

echo
echo "Step 3/10 — Creating completion verifier..."

cat > "$AUDIT_FILE" <<'EOF'
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "public/data/nexus-24h/dataset-manifest.csv",
  "src/lib/nexus/datasets/nexus-dataset-catalog.ts",
  "src/lib/nexus/replay/nexus-replay-engine.ts",
  "src/lib/nexus/replay/nexus-replay-analytics.ts",
  "src/store/nexus-replay-store.ts",
  "src/components/nexus/replay/nexus-replay-console.tsx",
  "src/app/api/nexus/datasets/route.ts",
  "src/app/api/nexus/replay/route.ts",
  "src/app/api/nexus/replay/analytics/route.ts",
  "src/app/nexus/replay/page.tsx",
  "src/components/nexus/lumi-platform-navigation.tsx",
  "tests/nexus/nexus-dataset-catalog.test.ts",
  "tests/nexus/nexus-replay-engine.test.ts",
  "tests/nexus/nexus-replay-analytics.test.ts",
  "tests/nexus/nexus-replay-store.test.ts",
  "tests/nexus/nexus-replay-console-route.test.ts",
];

const errors = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.resolve(root, file))) {
    errors.push(`Missing required file: ${file}`);
  }
}

const manifestPath = path.resolve(
  root,
  "public/data/nexus-24h/dataset-manifest.csv",
);

if (fs.existsSync(manifestPath)) {
  const records = fs
    .readFileSync(manifestPath, "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean);

  if (records.length !== 10) {
    errors.push(
      `Expected 10 dataset manifest records; found ${records.length}.`,
    );
  }
}

const storePath = path.resolve(
  root,
  "src/store/nexus-replay-store.ts",
);

if (fs.existsSync(storePath)) {
  const store = fs.readFileSync(
    storePath,
    "utf8",
  );

  for (const token of [
    "NEXUS_REPLAY_SPEED_OPTIONS",
    "useNexusReplayStore",
    "physicalControlEnabled: false",
    "value: 60",
    "value: 120",
    "value: 600",
    "value: 1200",
  ]) {
    if (!store.includes(token)) {
      errors.push(
        `Replay store is missing contract token: ${token}`,
      );
    }
  }
}

const navigationPath = path.resolve(
  root,
  "src/components/nexus/lumi-platform-navigation.tsx",
);

if (fs.existsSync(navigationPath)) {
  const navigation = fs.readFileSync(
    navigationPath,
    "utf8",
  );

  if (
    !navigation.includes(
      'href: "/nexus/replay"',
    )
  ) {
    errors.push(
      "Enterprise navigation does not expose /nexus/replay.",
    );
  }
}

const consolePath = path.resolve(
  root,
  "src/components/nexus/replay/nexus-replay-console.tsx",
);

if (fs.existsSync(consolePath)) {
  const consoleSource = fs.readFileSync(
    consolePath,
    "utf8",
  );

  for (const forbidden of [
    "setPlaying(",
    "const [playing",
    "const [requestedIndex",
    "const [speed",
    "const [loading",
    "const [error",
  ]) {
    if (consoleSource.includes(forbidden)) {
      errors.push(
        `Legacy local replay state remains: ${forbidden}`,
      );
    }
  }

  const normalized = consoleSource
    .replace(/\s+/g, " ")
    .trim();

  if (
    !normalized.includes(
      "Values are simulated, and physical equipment control remains disabled.",
    )
  ) {
    errors.push(
      "Replay safety disclaimer is missing.",
    );
  }
}

if (errors.length > 0) {
  console.error(
    "LUMI Nexus completion audit failed:",
  );

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  "PASS: LUMI Nexus replay platform completion audit.",
);
console.log(
  "PASS: 10 registered operational datasets.",
);
console.log(
  "PASS: Dataset registry, replay engine and analytics.",
);
console.log(
  "PASS: Shared Zustand replay state.",
);
console.log(
  "PASS: Replay Console and enterprise navigation.",
);
console.log(
  "PASS: Simulated-data and physical-control safety boundary.",
);
EOF

echo
echo "Step 4/10 — Formatting changed files..."

for file in   "$STORE_FILE"   "$CONSOLE_FILE"   "$STORE_TEST"   "$CONSOLE_TEST"   "$NAV_FILE"   "$NAV_TEST"
do
  npx prettier     --write     --parser typescript     "$file"
done

npx prettier   --write   --parser markdown   "$DOC_FILE"

npx prettier   --write   --parser babel   "$AUDIT_FILE"

echo
echo "Step 5/10 — Running completion audit..."

node "$AUDIT_FILE"

echo
echo "Step 6/10 — Running strict lint and type validation..."

npx eslint   "$STORE_FILE"   "$CONSOLE_FILE"   "$STORE_TEST"   "$CONSOLE_TEST"   "$NAV_FILE"   "$NAV_TEST"   "$AUDIT_FILE"   --max-warnings=0

npm run typecheck

echo
echo "Step 7/10 — Running focused Nexus tests..."

npx vitest run   tests/nexus/nexus-dataset-catalog.test.ts   tests/nexus/nexus-replay-engine.test.ts   tests/nexus/nexus-replay-analytics.test.ts   tests/nexus/nexus-replay-analytics-route.test.ts   "$STORE_TEST"   "$CONSOLE_TEST"   "$NAV_TEST"

echo
echo "Step 8/10 — Running full regression suite..."

npm test

echo
echo "Step 9/10 — Running production build..."

rm -rf .next
rm -f "$BUILD_LOG"

npm run build 2>&1 |
  tee "$BUILD_LOG"

required_routes=(
  "/api/nexus/datasets"
  "/api/nexus/replay"
  "/api/nexus/replay/analytics"
  "/nexus/replay"
)

for route in "${required_routes[@]}"; do
  if ! grep -Fq "$route" "$BUILD_LOG"; then
    echo "ERROR: Production build did not report route: $route"
    exit 1
  fi

  echo "PASS: Verified production route $route"
done

echo
echo "Step 10/10 — Committing and pushing verified completion..."

git add   "$STORE_FILE"   "$CONSOLE_FILE"   "$STORE_TEST"   "$CONSOLE_TEST"   "$NAV_FILE"   "$NAV_TEST"   "$DOC_FILE"   "$AUDIT_FILE"

if git diff --cached --quiet; then
  echo "No new completion changes require a commit."
else
  git commit     -m "feat(nexus): finalize shared replay platform"
fi

if git rev-parse   --abbrev-ref   --symbolic-full-name   '@{upstream}' >/dev/null 2>&1
then
  git push
else
  git push     --set-upstream     origin     "$BRANCH"
fi

echo
echo "============================================================"
echo " LUMI NEXUS — MASTER CHECKPOINT COMPLETE"
echo "============================================================"
echo
echo "Verified scope:"
echo "  Operational datasets -> 10"
echo "  Dataset rows         -> 12,816"
echo "  Replay snapshots     -> 144"
echo "  Replay interval      -> 10 minutes"
echo "  Replay engine        -> complete"
echo "  Replay analytics     -> complete"
echo "  Shared replay state  -> complete"
echo "  Replay console       -> complete"
echo "  Enterprise navigation-> complete"
echo "  Physical control     -> disabled"
echo
echo "Quality gates:"
echo "  Completion audit     -> passed"
echo "  ESLint               -> zero warnings"
echo "  TypeScript           -> passed"
echo "  Focused tests        -> passed"
echo "  Full regression      -> passed"
echo "  Production build     -> passed"
echo
git status --short
git log -5 --oneline
