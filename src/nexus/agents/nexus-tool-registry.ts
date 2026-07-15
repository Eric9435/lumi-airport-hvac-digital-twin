import {
  NexusToolAuthorizationError,
  NexusToolNotFoundError,
} from "@/nexus/agents/nexus-agent-errors";

export interface NexusToolExecutionContext {
  agentId: string;
  requestedBy: string;
  permissions: readonly string[];
  correlationId: string;
}

export interface NexusToolDefinition<
  TInput = Record<string, unknown>,
  TOutput = unknown,
> {
  toolId: string;
  description: string;
  requiredPermission?: string;
  execute(input: TInput, context: NexusToolExecutionContext): Promise<TOutput>;
}

function hasPermission(
  permissions: readonly string[],
  requiredPermission: string,
): boolean {
  return permissions.includes("*") || permissions.includes(requiredPermission);
}

export class NexusToolRegistry {
  private readonly tools = new Map<
    string,
    NexusToolDefinition<unknown, unknown>
  >();

  register<TInput, TOutput>(tool: NexusToolDefinition<TInput, TOutput>): void {
    if (this.tools.has(tool.toolId)) {
      throw new Error(`Nexus tool ${tool.toolId} is already registered.`);
    }

    this.tools.set(tool.toolId, tool as NexusToolDefinition<unknown, unknown>);
  }

  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  list(): Array<{
    toolId: string;
    description: string;
    requiredPermission?: string;
  }> {
    return Array.from(this.tools.values())
      .map((tool) => ({
        toolId: tool.toolId,
        description: tool.description,
        requiredPermission: tool.requiredPermission,
      }))
      .sort((left, right) => left.toolId.localeCompare(right.toolId));
  }

  async execute<TInput, TOutput>(
    toolId: string,
    input: TInput,
    context: NexusToolExecutionContext,
  ): Promise<TOutput> {
    const tool = this.tools.get(toolId);

    if (!tool) {
      throw new NexusToolNotFoundError(`Nexus tool ${toolId} was not found.`);
    }

    if (
      tool.requiredPermission &&
      !hasPermission(context.permissions, tool.requiredPermission)
    ) {
      throw new NexusToolAuthorizationError(
        `${context.agentId} is not authorized to execute ${toolId}.`,
      );
    }

    return tool.execute(input, context) as Promise<TOutput>;
  }

  clear(): void {
    this.tools.clear();
  }
}
