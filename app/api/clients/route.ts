import { NextResponse } from "next/server";
import { jsonError, personFromRequest, requestIdFrom } from "@/kernel/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { kernel, person } = await personFromRequest(request);
    const clients = await kernel.clients.list(person);
    return NextResponse.json({ clients });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { kernel, person } = await personFromRequest(request);
    const body = await request.json();
    const created = await kernel.clients.create(person, body, requestIdFrom(request));
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
