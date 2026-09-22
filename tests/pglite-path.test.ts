import { describe, expect, it } from "vitest";
import { resolvePglitePath } from "@/modules/db/pglite-path";

describe("resolvePglitePath", () => {
  it("uses the preferred path when it is writable", () => {
    expect(resolvePglitePath(".data/dev", () => undefined, "/tmp/lfm-pglite")).toBe(".data/dev");
  });

  it("falls back when the preferred path is not writable", () => {
    const mkdir = (target: string) => {
      if (String(target).includes(".data")) {
        const error = new Error("permission denied") as NodeJS.ErrnoException;
        error.code = "EACCES";
        throw error;
      }
    };
    expect(resolvePglitePath(".data/dev", mkdir, "/tmp/lfm-pglite")).toBe("/tmp/lfm-pglite");
  });
});
