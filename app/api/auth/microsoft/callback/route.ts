import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { error: "Microsoft identity is not connected. Use authenticator sign-in." },
    { status: 501 },
  );
}
