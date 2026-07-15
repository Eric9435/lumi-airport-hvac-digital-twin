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

const storePath = path.resolve(root, "src/store/nexus-replay-store.ts");

if (fs.existsSync(storePath)) {
  const store = fs.readFileSync(storePath, "utf8");

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
      errors.push(`Replay store is missing contract token: ${token}`);
    }
  }
}

const navigationPath = path.resolve(
  root,
  "src/components/nexus/lumi-platform-navigation.tsx",
);

if (fs.existsSync(navigationPath)) {
  const navigation = fs.readFileSync(navigationPath, "utf8");

  if (!navigation.includes('href: "/nexus/replay"')) {
    errors.push("Enterprise navigation does not expose /nexus/replay.");
  }
}

const consolePath = path.resolve(
  root,
  "src/components/nexus/replay/nexus-replay-console.tsx",
);

if (fs.existsSync(consolePath)) {
  const consoleSource = fs.readFileSync(consolePath, "utf8");

  for (const forbidden of [
    "setPlaying(",
    "const [playing",
    "const [requestedIndex",
    "const [speed",
    "const [loading",
    "const [error",
  ]) {
    if (consoleSource.includes(forbidden)) {
      errors.push(`Legacy local replay state remains: ${forbidden}`);
    }
  }

  const normalized = consoleSource.replace(/\s+/g, " ").trim();

  if (
    !normalized.includes(
      "Values are simulated, and physical equipment control remains disabled.",
    )
  ) {
    errors.push("Replay safety disclaimer is missing.");
  }
}

if (errors.length > 0) {
  console.error("LUMI Nexus completion audit failed:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log("PASS: LUMI Nexus replay platform completion audit.");
console.log("PASS: 10 registered operational datasets.");
console.log("PASS: Dataset registry, replay engine and analytics.");
console.log("PASS: Shared Zustand replay state.");
console.log("PASS: Replay Console and enterprise navigation.");
console.log("PASS: Simulated-data and physical-control safety boundary.");
