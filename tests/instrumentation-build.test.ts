import { describe, expect, it } from "vitest";
import { isNextProductionBuild } from "@/instrumentation";

describe("isNextProductionBuild", () => {
  it("is true during next build", () => {
    const previous = process.env.NEXT_PHASE;
    process.env.NEXT_PHASE = "phase-production-build";
    expect(isNextProductionBuild()).toBe(true);
    if (previous === undefined) {
      delete process.env.NEXT_PHASE;
    } else {
      process.env.NEXT_PHASE = previous;
    }
  });
});
