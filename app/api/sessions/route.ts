import { NextResponse } from "next/server";
import { jsonError, personFromRequest } from "@/kernel/http";
import { formatFirmStamp } from "@/modules/web-app/format";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { kernel, person, sessionId } = await personFromRequest(request);
    const settings = await kernel.firmSettings.read();
    const rows = await kernel.auth.listSessions(person);
    return NextResponse.json({
      sessions: rows.map((row) => ({
        id: row.id,
        current: row.id === sessionId,
        started: formatFirmStamp(row.createdAt.toISOString(), settings.timezone),
        device: row.userAgent,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
