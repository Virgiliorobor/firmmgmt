export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureKernel } = await import("./kernel/create-kernel");
    const { demoUsersFromEnv, seedDemoUsers } = await import("./kernel/seed");
    const kernel = await ensureKernel();
    if (kernel.env.seedOnStart) {
      await seedDemoUsers(kernel, demoUsersFromEnv());
    }
  }
}
