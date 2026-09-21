export type UserRole =
  | "managing_partner"
  | "administrative_manager"
  | "lawyer_or_analyst"
  | "integration_operator";

export type ClientCategory = "close_attention" | "standard" | "lower_priority";

export type EventEnvelope<T extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  type: string;
  at: string;
  source: string;
  request_id: string;
  actor_id: string | null;
  payload: T;
  version: number;
};

export type Person = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
};

export type SessionRecord = {
  id: string;
  userId: string;
  role: UserRole;
  expiresAt: Date;
  idleExpiresAt: Date;
};

export function isManagementRole(role: UserRole): boolean {
  return role === "managing_partner" || role === "administrative_manager";
}

export function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const ms = Date.now();
  bytes[0] = (ms / 2 ** 40) & 0xff;
  bytes[1] = (ms / 2 ** 32) & 0xff;
  bytes[2] = (ms / 2 ** 24) & 0xff;
  bytes[3] = (ms / 2 ** 16) & 0xff;
  bytes[4] = (ms / 2 ** 8) & 0xff;
  bytes[5] = ms & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function nowUtc(): Date {
  return new Date();
}

export const FIRM_SETTINGS_ID = "00000000-0000-7000-8000-000000000001";

export const SYSTEM_PRACTICE_AREAS = [
  "Imports and customs",
  "Export controls",
  "Contracts",
  "Other",
] as const;

export const CLIENT_CATEGORY_LABELS: Record<ClientCategory, string> = {
  close_attention: "Close attention",
  standard: "Standard",
  lower_priority: "Lower priority",
};
