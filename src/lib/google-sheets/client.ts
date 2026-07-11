import { randomUUID } from "node:crypto";

import type {
  AppsScriptRequest,
  AppsScriptResponse,
} from "@/types/persistence";

interface AppsScriptClientOptions {
  endpoint?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class AppsScriptClient {
  private readonly endpoint?: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(options: AppsScriptClientOptions = {}) {
    this.endpoint = options.endpoint ?? process.env.GOOGLE_APPS_SCRIPT_URL;

    this.apiKey = options.apiKey ?? process.env.GOOGLE_APPS_SCRIPT_API_KEY;

    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  get configured(): boolean {
    return Boolean(this.endpoint);
  }

  async request<TResponse, TPayload = unknown>(
    action: string,
    payload?: TPayload,
  ): Promise<TResponse> {
    if (!this.endpoint) {
      throw new Error("GOOGLE_APPS_SCRIPT_URL is not configured.");
    }

    const requestId = randomUUID();

    const body: AppsScriptRequest<TPayload> = {
      action,
      requestId,
      timestamp: new Date().toISOString(),
      apiKey: this.apiKey,
      payload,
    };

    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Apps Script request failed with HTTP ${response.status}.`,
        );
      }

      const result = (await response.json()) as AppsScriptResponse<TResponse>;

      if (!result.success) {
        throw new Error(
          result.error ?? "Apps Script returned an unknown error.",
        );
      }

      if (result.data === undefined) {
        throw new Error("Apps Script response did not include data.");
      }

      return result.data;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const appsScriptClient = new AppsScriptClient();
