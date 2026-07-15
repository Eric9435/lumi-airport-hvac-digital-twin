export class NexusAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NexusAgentNotFoundError extends NexusAgentError {}

export class NexusAgentConflictError extends NexusAgentError {}

export class NexusAgentExecutionError extends NexusAgentError {}

export class NexusToolNotFoundError extends NexusAgentError {}

export class NexusToolAuthorizationError extends NexusAgentError {}
