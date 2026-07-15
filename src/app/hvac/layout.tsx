import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "LUMI HVAC Digital Twin",
  description:
    "Airport HVAC Digital Twin, simulation, energy intelligence, diagnostics and predictive-maintenance platform.",
};

interface HvacLayoutProps {
  children: ReactNode;
}

export default function HvacLayout({ children }: HvacLayoutProps) {
  return children;
}
