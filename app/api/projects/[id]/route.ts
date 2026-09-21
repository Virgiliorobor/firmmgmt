import { NextResponse } from "next/server";
import { jsonError, personFromRequest } from "@/kernel/http";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { kernel, person } = await personFromRequest(request);
    const project = await kernel.projects.get(person, id);
    return NextResponse.json({ project });
  } catch (error) {
    return jsonError(error);
  }
}
