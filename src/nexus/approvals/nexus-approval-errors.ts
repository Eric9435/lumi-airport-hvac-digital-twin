export class NexusApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NexusApprovalNotFoundError extends NexusApprovalError {}

export class NexusApprovalConflictError extends NexusApprovalError {}

export class NexusApprovalAuthorizationError extends NexusApprovalError {}

export class NexusApprovalTransitionError extends NexusApprovalError {}
