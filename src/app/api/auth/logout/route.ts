import { NextRequest, NextResponse } from "next/server";
import { apiBase, clearSessionCookie, csrfOk, SESSION_COOKIE } from "@/lib/server";

export async function POST(req: NextRequest) {
  if (!csrfOk(req)) return NextResponse.json({ detail: "Request blocked." }, { status: 403 });
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    // Best effort: tell the backend, but always clear the cookie.
    await fetch(`${apiBase()}/platform/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
