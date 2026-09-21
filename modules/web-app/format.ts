export function formatFirmStamp(iso: string, timeZone = "America/New_York"): string {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
  return `${date} (${timeZone})`;
}
