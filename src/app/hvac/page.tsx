import { redirect } from "next/navigation";

/**
 * Canonical HVAC dashboard route is /dashboard.
 * /hvac is retained as a stable compatibility route.
 */
export default function HvacRoute(): never {
  redirect("/dashboard");
}
