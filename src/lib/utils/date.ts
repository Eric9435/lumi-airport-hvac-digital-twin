export function nowIso(): string {
  return new Date().toISOString();
}

export function formatLocalDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}
