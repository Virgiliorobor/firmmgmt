import { AsyncLocalStorage } from "node:async_hooks";
import { applyMigrations, openDatabase, type AppDb, type DbHandle } from "@/modules/db";
import { loadEnv, type AppEnv } from "@/modules/db/env";
import { createEventBus, type EventBus } from "@/modules/event-bus";
import { createAuditLog } from "@/modules/audit-log";
import { createPolicy, type Policy } from "@/modules/policy";
import { createRateLimit } from "@/modules/rate-limit";
import { createAuth, type Auth } from "@/modules/auth";
import { createPracticeArea, type PracticeArea } from "@/modules/practice-area";
import { createFirmSettings, type FirmSettings } from "@/modules/firm-settings";
import { createClientModule, type ClientModule } from "@/modules/client";
import { createProjectModule, type ProjectModule } from "@/modules/project";

export type Kernel = {
  handle: DbHandle;
  db: AppDb;
  env: AppEnv;
  bus: EventBus;
  auth: Auth;
  policy: Policy;
  practiceArea: PracticeArea;
  firmSettings: FirmSettings;
  clients: ClientModule;
  projects: ProjectModule;
  close: () => Promise<void>;
};

export async function createKernel(options?: {
  memory?: boolean;
  pglitePath?: string;
  databaseUrl?: string;
  env?: AppEnv;
}): Promise<Kernel> {
  const env = options?.env ?? loadEnv();
  const handle = await openDatabase({
    memory: options?.memory,
    pglitePath: options?.pglitePath,
    databaseUrl: options?.memory ? undefined : (options?.databaseUrl ?? env.databaseUrl),
  });
  await applyMigrations(handle);
  const getDb = () => handle.db;
  const bus = createEventBus(getDb);
  createAuditLog(getDb, bus);
  const rateLimit = createRateLimit(getDb, env, bus);
  const auth = createAuth({ getDb, bus, rateLimit, env });
  const policy = createPolicy(getDb);
  const practiceArea = createPracticeArea(getDb, bus);
  const firmSettings = createFirmSettings(getDb, env);
  const clients = createClientModule(getDb, bus, policy);
  const projects = createProjectModule(getDb, bus, policy);
  await practiceArea.seedSystem();
  await firmSettings.ensureSingleton();
  return {
    handle,
    db: handle.db,
    env,
    bus,
    auth,
    policy,
    practiceArea,
    firmSettings,
    clients,
    projects,
    close: () => handle.close(),
  };
}

export const kernelAls = new AsyncLocalStorage<Kernel>();

let fallback: Kernel | null = null;
let fallbackPromise: Promise<Kernel> | null = null;

export function setFallbackKernel(kernel: Kernel): void {
  fallback = kernel;
}

export function currentKernel(): Kernel {
  const fromAls = kernelAls.getStore();
  if (fromAls) return fromAls;
  if (fallback) return fallback;
  throw new Error("Application kernel is not ready");
}

export async function ensureKernel(): Promise<Kernel> {
  const fromAls = kernelAls.getStore();
  if (fromAls) return fromAls;
  if (fallback) return fallback;
  if (!fallbackPromise) {
    fallbackPromise = createKernel().then((kernel) => {
      fallback = kernel;
      return kernel;
    });
  }
  return fallbackPromise;
}

export function runWithKernel<T>(kernel: Kernel, fn: () => T): T {
  return kernelAls.run(kernel, fn);
}

export async function resetKernelState(): Promise<void> {
  if (fallback) {
    await fallback.close();
  }
  fallback = null;
  fallbackPromise = null;
}
