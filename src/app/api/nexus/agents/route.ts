import { NextResponse } from "next/server";

import { nexusAgentRegistry } from "@/nexus/agents";

export async function GET(): Promise<NextResponse> {
  const agents = nexusAgentRegistry.list().map((agent) => ({
    agentId: agent.agentId,
    name: agent.name,
    description: agent.description,
    supportedTwins: agent.supportedTwins,
    deterministic: agent.deterministic,
    llmReady: agent.llmReady,
  }));

  return NextResponse.json(
    {
      count: agents.length,
      runtimeMode: "deterministic",
      autonomousPhysicalControl: false,
      agents,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
