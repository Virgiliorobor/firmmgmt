import { createKernel } from "../kernel/create-kernel";
import { demoUsersFromEnv, seedDemoUsers } from "../kernel/seed";

async function main() {
  const kernel = await createKernel();
  const users = demoUsersFromEnv();
  if (users.length === 0) {
    console.log("No DEMO_* env vars set. Skipping demo users.");
    await kernel.close();
    return;
  }
  await seedDemoUsers(kernel, users);
  console.log(`Seeded ${users.length} demo user(s). Passwords and TOTP secrets stay in env only.`);
  await kernel.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
