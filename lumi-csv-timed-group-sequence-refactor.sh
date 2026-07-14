#!/usr/bin/env bash
set -Eeuo pipefail

cd /workspaces/lumi-airport-hvac-digital-twin || exit 1

echo "============================================================"
echo "LUMI — CSV-Timed Per-Group Plant Sequence Refactor"
echo "============================================================"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR=".fix-backups/csv-timed-group-sequence-${STAMP}"

FILES=(
  "src/lib/sensor-data/replay-timing.ts"
  "src/store/sensor-replay-store.ts"
  "src/store/plant-sequence-runtime-store.ts"
  "src/components/sensor-data/sensor-replay-runtime.tsx"
  "src/components/enterprise/csv-sequence-trigger.tsx"
  "src/components/enterprise/enterprise-plant-runtime.tsx"
  "src/components/enterprise/group-csv-sequence-status.tsx"
  "src/components/enterprise/plant-sequence-overview.tsx"
  "src/components/dashboard/csv-dashboard-plant-bridge.tsx"
  "src/app/plant-sequence/page.tsx"
  "tests/enterprise/csv-sequence-runtime.test.ts"
  "tests/unit/replay-timing.test.ts"
)

for FILE in "${FILES[@]}"; do
  if [ -f "${FILE}" ]; then
    mkdir -p "${BACKUP_DIR}/$(dirname "${FILE}")"
    cp "${FILE}" "${BACKUP_DIR}/${FILE}"
  fi
done

echo
echo "Backup created:"
echo "${BACKUP_DIR}"

python3 - <<'PYFILES'
import base64
import io
import tarfile
from pathlib import Path

payload = """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"""
data = base64.b64decode(payload)

with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
    root = Path.cwd().resolve()

    for member in archive.getmembers():
        destination = (root / member.name).resolve()

        if root not in destination.parents and destination != root:
            raise SystemExit(f"Unsafe archive path: {member.name}")

    archive.extractall(root)
PYFILES

python3 - <<'PYPATCH'
from pathlib import Path
import re

# Remove the old duplicated timeline implementation and insert one compact
# sequence status component inside each physical chiller-group card.
overview = Path("src/components/enterprise/plant-sequence-overview.tsx")
text = overview.read_text()

text = text.replace(
    'import { PLANT_SEQUENCE_STEPS } from "@/lib/enterprise/plant-sequence-engine";\n',
    "",
)
text = text.replace(
    'import { usePlantSequenceRuntime } from "@/store/plant-sequence-runtime-store";\n',
    "",
)

status_import = (
    'import { GroupCsvSequenceStatus } from '
    '"@/components/enterprise/group-csv-sequence-status";\n'
)

if status_import not in text:
    anchor = 'import { useMemo } from "react";\n\n'

    if anchor not in text:
        raise SystemExit("Plant overview import anchor not found.")

    text = text.replace(anchor, anchor + status_import, 1)

text = re.sub(
    r"\n  const sequenceActive = usePlantSequenceRuntime\([\s\S]*?"
    r"\n  const runningTransformers =",
    "\n  const runningTransformers =",
    text,
    count=1,
)

text = re.sub(
    r"\n  const sequenceStepStatus = \([\s\S]*?"
    r"\n  const groupedEquipment =",
    "\n  const groupedEquipment =",
    text,
    count=1,
)

text = re.sub(
    r'\n              \{sequenceRequiredChillers > 0 &&[\s\S]*?'
    r'\n              <div className="mt-5 space-y-2">',
    '\n              <GroupCsvSequenceStatus\n'
    '                groupId={group.groupId}\n'
    '                chillerId={group.chillerId}\n'
    '              />\n\n'
    '              <div className="mt-5 space-y-2">',
    text,
    count=1,
)

text = text.replace("\n              {false && null}\n", "\n")

if "<GroupCsvSequenceStatus" not in text:
    anchor = '\n              <div className="mt-5 space-y-2">'

    if anchor not in text:
        raise SystemExit("Plant group equipment-list anchor not found.")

    component = (
        "\n              <GroupCsvSequenceStatus\n"
        "                groupId={group.groupId}\n"
        "                chillerId={group.chillerId}\n"
        "              />\n"
    )

    text = text.replace(anchor, component + anchor, 1)

overview.write_text(text)

# The legacy dashboard must follow actual enterprise groups that have finished
# their sequence, not jump immediately to the new CSV target count.
bridge = Path("src/components/dashboard/csv-dashboard-plant-bridge.tsx")
text = bridge.read_text()

text = text.replace(
    'import { calculateRequiredChillerCount } from '
    '"@/lib/sensor-data/sensor-csv-parser";\n',
    "",
)

enterprise_import = (
    'import { useEnterprisePlantStore } from '
    '"@/store/enterprise-plant-store";\n'
)

if enterprise_import not in text:
    anchor = (
        'import { useSensorReplayStore } from '
        '"@/store/sensor-replay-store";\n'
    )

    if anchor not in text:
        raise SystemExit("Dashboard bridge import anchor not found.")

    text = text.replace(anchor, enterprise_import + anchor, 1)

if "const runningEnterpriseChillers" not in text:
    anchor = (
        "  const replayStatus = useSensorReplayStore((state) => state.status);\n\n"
        "  const currentRow = rows[currentIndex];"
    )
    replacement = (
        "  const replayStatus = useSensorReplayStore((state) => state.status);\n\n"
        "  const runningEnterpriseChillers = useEnterprisePlantStore(\n"
        "    (state) =>\n"
        "      state.groups.filter((group) => group.status === \"running\")\n"
        "        .length,\n"
        "  );\n\n"
        "  const currentRow = rows[currentIndex];"
    )

    if anchor not in text:
        raise SystemExit("Dashboard bridge component anchor not found.")

    text = text.replace(anchor, replacement, 1)

text = re.sub(
    r"    const requiredChillers = calculateRequiredChillerCount\("
    r"[\s\S]*?\n    \);",
    "    /* Dashboard equipment follows completed enterprise sequence state. */\n"
    "    const requiredChillers = runningEnterpriseChillers;",
    text,
    count=1,
)

if "const requiredChillers = runningEnterpriseChillers;" not in text:
    raise SystemExit("Dashboard required-chiller staging patch was not applied.")

text = text.replace(
    "  }, [currentIndex, currentRow, replayStatus]);",
    "  }, [\n"
    "    currentIndex,\n"
    "    currentRow,\n"
    "    replayStatus,\n"
    "    runningEnterpriseChillers,\n"
    "  ]);",
)

bridge.write_text(text)

# The separate page-wide timeline is intentionally removed. Timing now appears
# only inside the affected physical chiller-group card.
page = Path("src/app/plant-sequence/page.tsx")
text = page.read_text()
text = text.replace(
    'import LivePlantSequenceTimeline from '
    '"@/components/enterprise/live-plant-sequence-timeline";\n',
    "",
)
text = text.replace("\n          <LivePlantSequenceTimeline />\n", "\n")
page.write_text(text)
PYPATCH

echo
echo "============================================================"
echo "Refactored:"
echo "✓ CSV rows update demand targets only"
echo "✓ CSV rows no longer call startChillerGroup/stopChillerGroup directly"
echo "✓ Each target change runs a staged startup or shutdown sequence"
echo "✓ Only affected groups receive a sequence"
echo "✓ Groups stage sequentially instead of showing duplicate timelines"
echo "✓ 10-minute CSV intervals are read from adjacent timestamps"
echo "✓ Sequence duration scales to finish inside the CSV interval"
echo "✓ Replay speed changes wall-clock speed, not simulated engineering time"
echo "✓ Group-card status shows CSV time, current step and remaining seconds"
echo "✓ Dashboard equipment follows completed enterprise sequence state"
echo "✓ Separate page-wide timeline removed"
echo "============================================================"

echo
echo "================ FORMAT ===================="
npx prettier --write \
  src/lib/sensor-data/replay-timing.ts \
  src/store/sensor-replay-store.ts \
  src/store/plant-sequence-runtime-store.ts \
  src/components/sensor-data/sensor-replay-runtime.tsx \
  src/components/enterprise/csv-sequence-trigger.tsx \
  src/components/enterprise/enterprise-plant-runtime.tsx \
  src/components/enterprise/group-csv-sequence-status.tsx \
  src/components/enterprise/plant-sequence-overview.tsx \
  src/components/dashboard/csv-dashboard-plant-bridge.tsx \
  src/app/plant-sequence/page.tsx \
  tests/enterprise/csv-sequence-runtime.test.ts \
  tests/unit/replay-timing.test.ts

echo
echo "================ ARCHITECTURE CHECK ========="
if grep -nE "startChillerGroup|stopChillerGroup" src/store/sensor-replay-store.ts; then
  echo "ERROR: Sensor replay still changes chiller groups directly."
  exit 1
else
  echo "✓ Sensor replay contains no direct group-start/group-stop calls."
fi

grep -n "getCsvIntervalSeconds" \
  src/components/enterprise/csv-sequence-trigger.tsx \
  src/components/sensor-data/sensor-replay-runtime.tsx

grep -n "GroupCsvSequenceStatus" \
  src/components/enterprise/plant-sequence-overview.tsx

echo
echo "================ TYPE CHECK ================="
npm run typecheck

echo
echo "================ LINT ======================="
npm run lint

echo
echo "================ TEST ======================="
npm run test

echo
echo "================ PRODUCTION BUILD ==========="
npm run build

echo
echo "================ PROJECT VERIFY ============="
if [ -f scripts/verify-project.sh ]; then
  bash scripts/verify-project.sh
elif [ -f verify-project.sh ]; then
  bash verify-project.sh
else
  echo "No project verification script found — skipped."
fi

echo
echo "================ PRODUCTION VERIFY =========="
if [ -f scripts/verify-production.sh ]; then
  bash scripts/verify-production.sh
elif [ -f verify-production.sh ]; then
  bash verify-production.sh
else
  echo "No production verification script found — skipped."
fi

echo
echo "================ GIT DIFF STAT =============="
git --no-pager diff --stat

echo
echo "================ GIT STATUS ================="
git status --short

echo
echo "============================================================"
echo "Completed:"
echo "✓ CSV timing and plant sequence are synchronized"
echo "✓ Equipment changes occur only after sequence-step completion"
echo "✓ New CSV rows create a new staged transition only when demand changes"
echo "✓ Startup and shutdown timing appears inside affected group cards"
echo "✓ TypeScript, lint, tests and production build completed"
echo "============================================================"

echo
echo "Expected 24-hour / 10-minute replay behavior at 1×:"
echo "• One CSV snapshot every 2 real seconds"
echo "• Each snapshot represents 600 simulated seconds"
echo "• Startup/shutdown sequence completes within 85% of that interval"
echo "• GROUP-01 finishes before GROUP-02 begins when both are newly required"
echo "• An unchanged target produces no repeated sequence"
echo "• A lower target runs shutdown from the highest running group downward"
echo
echo "Test:"
echo "1. npm run dev"
echo "2. Open http://localhost:3000/sensor-data-import"
echo "3. Load yia-24h-10min.csv and start replay"
echo "4. Open http://localhost:3000/plant-sequence"
echo "5. Watch only the affected GROUP card change step-by-step"
