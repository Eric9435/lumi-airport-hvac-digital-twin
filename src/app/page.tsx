import { redirect } from "next/navigation";

/**
 * LUMI Nexus is the primary platform entry point.
 *
 * The original LUMI Airport HVAC Digital Twin remains available at /hvac.
 */
export default function RootPage(): never {
  redirect("/nexus");
}
