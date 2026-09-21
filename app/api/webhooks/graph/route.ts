import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({ error: "Graph webhook is not connected in this local version." }, { status: 501 });
}
