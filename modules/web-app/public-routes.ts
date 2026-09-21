export const PUBLIC_PATHS = new Set([
  "/sign-in",
  "/api/health",
  "/api/auth/microsoft/callback",
  "/api/auth/totp/start",
  "/api/auth/totp/verify",
  "/api/webhooks/graph",
  "/security.txt",
]);

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/auth/totp/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/_next/")) return true;
  return false;
}

export function requiresJsonUnauthorized(pathname: string): boolean {
  return pathname === "/projects" || pathname.startsWith("/api/");
}
