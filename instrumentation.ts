export function isNextProductionBuild(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

export async function register() {
  if (isNextProductionBuild()) {
    return;
  }
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureKernel } = await import("./kernel/create-kernel");
    const { demoUsersFromEnv, seedDemoUsers } = await import("./kernel/seed");
    const kernel = await ensureKernel();
    if (kernel.env.seedOnStart) {
      await seedDemoUsers(kernel, demoUsersFromEnv());
    }
  }
}
