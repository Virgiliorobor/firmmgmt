import { NextResponse } from "next/server";
import { jsonError, personFromRequest, requestIdFrom } from "@/kernel/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { kernel, person } = await personFromRequest(request);
    const projects = await kernel.projects.list(person);
    return NextResponse.json({ projects });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { kernel, person } = await personFromRequest(request);
    const body = await request.json();
    const created = await kernel.projects.create(person, body, requestIdFrom(request));
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
