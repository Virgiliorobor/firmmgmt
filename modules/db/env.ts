import { defaultPgliteFallback } from "./pglite-path";

function emptyToUndefined(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return undefined;
  return value;
}

export type AppEnv = {
  nodeEnv: "development" | "test" | "production";
  databaseUrl?: string;
  pglitePath: string;
  appBaseUrl: string;
  firmTimezone: string;
  firmLocale: string;
  dedicatedIntakeAddress?: string;
  sessionSecret: string;
  sessionIdleHours: number;
  authProvider: "totp-local" | "microsoft";
  microsoftTenantId?: string;
  microsoftClientId?: string;
  microsoftClientSecret?: string;
  microsoftRedirectUri?: string;
  microsoftMfaProven: boolean;
  totpIssuer: string;
  fieldEncryptionKey: string;
  rateLimitMaxPerMinute: number;
  lockoutFailures: number;
  gitSha: string;
  seedOnStart: boolean;
  corsOrigins: string[];
};

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const nodeEnv = (source.NODE_ENV as AppEnv["nodeEnv"]) || "development";
  const sessionSecret = source.SESSION_SECRET || "test-session-secret-at-least-32-chars!!";
  return {
    nodeEnv,
    databaseUrl: emptyToUndefined(source.DATABASE_URL),
    pglitePath: source.PGLITE_PATH || (nodeEnv === "production" ? defaultPgliteFallback() : ".data/dev"),
    appBaseUrl: source.APP_BASE_URL || "http://localhost:3847",
    firmTimezone: source.FIRM_TIMEZONE || "America/New_York",
    firmLocale: source.FIRM_LOCALE || "en-US",
    dedicatedIntakeAddress: emptyToUndefined(source.DEDICATED_INTAKE_ADDRESS),
    sessionSecret,
    sessionIdleHours: Number(source.SESSION_IDLE_HOURS || 24),
    authProvider: source.AUTH_PROVIDER === "microsoft" ? "microsoft" : "totp-local",
    microsoftTenantId: emptyToUndefined(source.MICROSOFT_TENANT_ID),
    microsoftClientId: emptyToUndefined(source.MICROSOFT_CLIENT_ID),
    microsoftClientSecret: emptyToUndefined(source.MICROSOFT_CLIENT_SECRET),
    microsoftRedirectUri: emptyToUndefined(source.MICROSOFT_REDIRECT_URI),
    microsoftMfaProven: source.MICROSOFT_MFA_PROVEN === "true",
    totpIssuer: source.TOTP_ISSUER || "Law firm management",
    fieldEncryptionKey:
      source.FIELD_ENCRYPTION_KEY ||
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    rateLimitMaxPerMinute: Number(source.RATE_LIMIT_MAX_PER_MINUTE || 5),
    lockoutFailures: Number(source.LOCKOUT_FAILURES || 10),
    gitSha: source.GIT_SHA || "dev",
    seedOnStart: source.SEED_ON_START === "true",
    corsOrigins: (source.CORS_ORIGINS || source.APP_BASE_URL || "http://localhost:3847").split(","),
  };
}
