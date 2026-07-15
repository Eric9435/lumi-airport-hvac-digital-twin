import { InMemoryNexusApprovalRepository } from "@/nexus/approvals/in-memory-nexus-approval-repository";
import { NexusApprovalService } from "@/nexus/approvals/nexus-approval-service";
import { nexusEventBus } from "@/nexus/events";

declare global {
  var __lumiNexusApprovalRepository:
    InMemoryNexusApprovalRepository | undefined;

  var __lumiNexusApprovalService: NexusApprovalService | undefined;
}

const repository =
  globalThis.__lumiNexusApprovalRepository ??
  new InMemoryNexusApprovalRepository();

const service =
  globalThis.__lumiNexusApprovalService ??
  new NexusApprovalService(repository, nexusEventBus);

if (process.env.NODE_ENV !== "production") {
  globalThis.__lumiNexusApprovalRepository = repository;
  globalThis.__lumiNexusApprovalService = service;
}

export const nexusApprovalRepository = repository;
export const nexusApprovalService = service;
