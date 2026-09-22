import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export function defaultPgliteFallback(): string {
  return path.join(tmpdir(), "lfm-pglite");
}

type Mkdir = (target: string, options?: { recursive?: boolean }) => unknown;

export function resolvePglitePath(
  preferred: string,
  mkdir: Mkdir = mkdirSync,
  fallback: string = defaultPgliteFallback(),
): string {
  try {
    mkdir(path.resolve(preferred), { recursive: true });
    return preferred;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EACCES" || code === "EROFS") {
      mkdir(path.resolve(fallback), { recursive: true });
      return fallback;
    }
    throw error;
  }
}
