import { NextRequest, NextResponse } from "next/server";
import { apiBase, clearSessionCookie, SESSION_COOKIE, setSessionCookie } from "@/lib/server";

// Keep-alive + "who am I". Called while the admin is active; renews the 30 minute idle window.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: "Not signed in." }, { status: 401 });

  // Swap the token for a fresh one: the backend token is short-lived, the cookie slides with activity.
  const upstream = await fetch(`${apiBase()}/platform/auth/refresh`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) return NextResponse.json({ detail: "Cannot reach the server." }, { status: 502 });
  if (upstream.status === 401) {
    const res = NextResponse.json({ detail: "Session ended." }, { status: 401 });
    clearSessionCookie(res);
    return res;
  }
  const data = await upstream.json().catch(() => ({}));
  const res = NextResponse.json({ admin: data?.admin ?? null }, { status: upstream.ok ? 200 : upstream.status });
  if (upstream.ok && data?.access_token) setSessionCookie(res, data.access_token);
  return res;
}
