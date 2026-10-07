import { type NextRequest, NextResponse } from "next/server";

import { deleteSession } from "@/lib/session";

/** POST-only so a stray link or image tag can't sign someone out. */
export async function POST(request: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
