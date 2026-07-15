import { NexusEventBus } from "@/nexus/events/nexus-event-bus";

declare global {
  var __lumiNexusEventBus: NexusEventBus | undefined;
}

const eventBus =
  globalThis.__lumiNexusEventBus ??
  new NexusEventBus({
    maxHistorySize: 2_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__lumiNexusEventBus = eventBus;
}

export const nexusEventBus = eventBus;
