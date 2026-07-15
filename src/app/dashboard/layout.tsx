import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LumiPlatformShell } from "@/components/nexus";

export const metadata: Metadata = {
  title: {
    default: "LUMI HVAC Digital Twin",
    template: "%s | LUMI HVAC",
  },
  description:
    "Airport HVAC Digital Twin with plant simulation, industrial control, energy analytics, alarms and predictive maintenance.",
};

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <LumiPlatformShell>{children}</LumiPlatformShell>;
}
