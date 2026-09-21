import { NextResponse } from "next/server";
import { ensureKernel } from "@/kernel/create-kernel";

export const runtime = "nodejs";

export async function GET() {
  try {
    const kernel = await ensureKernel();
    const dbOk = await kernel.handle.ping();
    return NextResponse.json({
      ok: dbOk,
      db: dbOk ? "ok" : "down",
      outbox_heartbeat_at: kernel.bus.lastHeartbeatAt()?.toISOString() ?? null,
      sha: kernel.env.gitSha,
      timezone: kernel.env.firmTimezone,
      graph: "unconfigured",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Health check failed. Try again." }, { status: 500 });
  }
}
