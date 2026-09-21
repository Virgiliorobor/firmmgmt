import { rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { createKernel } from "../kernel/create-kernel";
import { demoUsersFromEnv, seedDemoUsers } from "../kernel/seed";

async function main() {
  const dir = process.env.PGLITE_PATH || ".data/e2e";
  rmSync(dir, { recursive: true, force: true });
  const kernel = await createKernel({ pglitePath: dir });
  await seedDemoUsers(kernel, demoUsersFromEnv());
  await kernel.close();

  const port = process.env.PORT || "3010";
  const child = spawn("npx", ["next", "dev", "--port", port], {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
