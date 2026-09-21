import { afterEach, describe, expect, it } from "vitest";
import { resetKernelState } from "@/kernel/create-kernel";
import { makeKernel } from "./helpers";

describe("policy.evaluate", () => {
  afterEach(async () => {
    await resetKernelState();
  });

  it("management users share the partner matrix", async () => {
    const kernel = await makeKernel();
    const partner = await kernel.auth.findUserByEmail("partner@example.local");
    const manager = await kernel.auth.findUserByEmail("admin.manager@example.local");
    if (!partner || !manager) throw new Error("missing management users");
    const project = { id: "00000000-0000-7000-8000-000000000099", title: "Sample", assigneeId: null };
    const a = await kernel.policy.evaluate(
      { id: partner.id, role: "managing_partner", isActive: true },
      project,
    );
    const b = await kernel.policy.evaluate(
      { id: manager.id, role: "administrative_manager", isActive: true },
      project,
    );
    expect(a.capabilities).toEqual(b.capabilities);
    expect(a.capabilities.createProject).toBe(true);
    expect(a.capabilities.assign).toBe(true);
  });
});
