import { randomUUID } from "node:crypto";

import {
  nexusEventSchema,
  publishNexusEventSchema,
  type NexusEvent,
  type NexusSeverity,
  type NexusTwinType,
  type PublishNexusEvent,
} from "@/nexus/contracts";

export interface NexusEventFilter {
  sourceTwin?: NexusTwinType;
  assetId?: string;
  eventType?: string;
  severity?: NexusSeverity;
  correlationId?: string;
  requiresHumanApproval?: boolean;
}

export type NexusEventHandler = (event: NexusEvent) => void | Promise<void>;

export interface NexusEventSubscription {
  readonly subscriptionId: string;
  unsubscribe(): void;
}

export interface NexusEventBusOptions {
  maxHistorySize?: number;
  onHandlerError?: (
    error: unknown,
    event: NexusEvent,
    subscriptionId: string,
  ) => void;
}

interface InternalSubscription {
  subscriptionId: string;
  filter: NexusEventFilter;
  handler: NexusEventHandler;
}

const DEFAULT_MAX_HISTORY_SIZE = 1_000;

function matchesFilter(event: NexusEvent, filter: NexusEventFilter): boolean {
  return (
    (filter.sourceTwin === undefined ||
      event.sourceTwin === filter.sourceTwin) &&
    (filter.assetId === undefined || event.assetId === filter.assetId) &&
    (filter.eventType === undefined || event.eventType === filter.eventType) &&
    (filter.severity === undefined || event.severity === filter.severity) &&
    (filter.correlationId === undefined ||
      event.correlationId === filter.correlationId) &&
    (filter.requiresHumanApproval === undefined ||
      event.requiresHumanApproval === filter.requiresHumanApproval)
  );
}

export class NexusEventBus {
  private readonly subscriptions = new Map<string, InternalSubscription>();

  private readonly history: NexusEvent[] = [];

  private readonly maxHistorySize: number;

  private readonly onHandlerError: NonNullable<
    NexusEventBusOptions["onHandlerError"]
  >;

  constructor(options: NexusEventBusOptions = {}) {
    const requestedHistorySize =
      options.maxHistorySize ?? DEFAULT_MAX_HISTORY_SIZE;

    if (!Number.isInteger(requestedHistorySize) || requestedHistorySize < 1) {
      throw new Error("Nexus event history size must be a positive integer.");
    }

    this.maxHistorySize = requestedHistorySize;
    this.onHandlerError =
      options.onHandlerError ??
      ((error, event, subscriptionId) => {
        console.error("Nexus event handler failed.", {
          error,
          eventId: event.eventId,
          subscriptionId,
        });
      });
  }

  async publish(input: PublishNexusEvent): Promise<NexusEvent> {
    const validatedInput = publishNexusEventSchema.parse(input);

    const event = nexusEventSchema.parse({
      ...validatedInput,
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
    });

    this.appendToHistory(event);

    const matchingSubscriptions = Array.from(
      this.subscriptions.values(),
    ).filter((subscription) => matchesFilter(event, subscription.filter));

    await Promise.allSettled(
      matchingSubscriptions.map(async (subscription) => {
        try {
          await subscription.handler(structuredClone(event));
        } catch (error) {
          this.onHandlerError(error, event, subscription.subscriptionId);
        }
      }),
    );

    return structuredClone(event);
  }

  subscribe(
    filter: NexusEventFilter,
    handler: NexusEventHandler,
  ): NexusEventSubscription {
    const subscriptionId = randomUUID();

    this.subscriptions.set(subscriptionId, {
      subscriptionId,
      filter: structuredClone(filter),
      handler,
    });

    return {
      subscriptionId,
      unsubscribe: () => {
        this.unsubscribe(subscriptionId);
      },
    };
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  getHistory(filter: NexusEventFilter = {}, limit?: number): NexusEvent[] {
    const filteredEvents = this.history.filter((event) =>
      matchesFilter(event, filter),
    );

    const resolvedLimit =
      limit === undefined
        ? filteredEvents.length
        : Math.max(0, Math.floor(limit));

    return filteredEvents
      .slice(-resolvedLimit)
      .map((event) => structuredClone(event));
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getHistorySize(): number {
    return this.history.length;
  }

  clearHistory(): void {
    this.history.length = 0;
  }

  clearSubscriptions(): void {
    this.subscriptions.clear();
  }

  private appendToHistory(event: NexusEvent): void {
    this.history.push(structuredClone(event));

    const overflow = this.history.length - this.maxHistorySize;

    if (overflow > 0) {
      this.history.splice(0, overflow);
    }
  }
}
