import { createKernel } from "../kernel/create-kernel";
import { applyMigrations } from "../modules/db";

async function main() {
  const kernel = await createKernel();
  await applyMigrations(kernel.handle);
  await kernel.close();
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
