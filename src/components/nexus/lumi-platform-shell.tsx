import type { ReactNode } from "react";

import { LumiPlatformNavigation } from "@/components/nexus/lumi-platform-navigation";

interface LumiPlatformShellProps {
  children: ReactNode;
}

export function LumiPlatformShell({ children }: LumiPlatformShellProps) {
  return (
    <>
      <LumiPlatformNavigation />

      <div id="lumi-main-content" className="min-h-screen pt-16">
        {children}
      </div>
    </>
  );
}
