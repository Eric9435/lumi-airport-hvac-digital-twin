import type { Metadata } from "next";

import { NexusCommandCenter } from "@/components/nexus/command-center/nexus-command-center";

export const metadata: Metadata = {
  title: "LUMI Nexus Unified Command Center",
  description:
    "Animated live cross-domain command center for the LUMI Nexus airport infrastructure intelligence platform.",
};

export default function NexusPage() {
  return <NexusCommandCenter />;
}
