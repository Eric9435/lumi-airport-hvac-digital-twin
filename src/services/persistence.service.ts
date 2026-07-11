import { randomUUID } from "node:crypto";

import { appsScriptClient } from "@/lib/google-sheets/client";

import type { PlantState } from "@/types/hvac";

import type {
  CommandLogRecord,
  StateSnapshotRecord,
} from "@/types/persistence";

export async function savePlantSnapshot(
  state: PlantState,
  source: "simulation" | "lumi" | "dashboard" | "system",
): Promise<{
  persisted: boolean;
  snapshotId: string;
}> {
  const snapshot: StateSnapshotRecord = {
    snapshotId: randomUUID(),
    timestamp: new Date().toISOString(),
    source,
    state,
  };

  if (!appsScriptClient.configured) {
    return {
      persisted: false,
      snapshotId: snapshot.snapshotId,
    };
  }

  await appsScriptClient.request("savePlantSnapshot", snapshot);

  return {
    persisted: true,
    snapshotId: snapshot.snapshotId,
  };
}

export async function saveCommandLog(
  command: Omit<CommandLogRecord, "commandId" | "requestedAt">,
): Promise<{
  persisted: boolean;
  commandId: string;
}> {
  const record: CommandLogRecord = {
    commandId: randomUUID(),
    requestedAt: new Date().toISOString(),
    ...command,
  };

  if (!appsScriptClient.configured) {
    return {
      persisted: false,
      commandId: record.commandId,
    };
  }

  await appsScriptClient.request("saveCommandLog", record);

  return {
    persisted: true,
    commandId: record.commandId,
  };
}
