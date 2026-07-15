import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LumiPlatformShell } from "@/components/nexus";

export const metadata: Metadata = {
  title: {
    default: "LUMI Nexus Command Center",
    template: "%s | LUMI Nexus",
  },
  description:
    "Unified airport infrastructure intelligence, Digital Twin and human-centred command platform.",
};

interface NexusLayoutProps {
  children: ReactNode;
}

export default function NexusLayout({ children }: NexusLayoutProps) {
  return <LumiPlatformShell>{children}</LumiPlatformShell>;
}
