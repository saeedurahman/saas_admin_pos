import { NextRequest, NextResponse } from "next/server";
import { apiBase, csrfOk, setSessionCookie } from "@/lib/server";

export async function POST(req: NextRequest) {
  if (!csrfOk(req)) return NextResponse.json({ detail: "Request blocked." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password || !body?.totp_code) {
    return NextResponse.json({ detail: "Enter your email, password and 6-digit code." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase()}/platform/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password, totp_code: body.totp_code }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Cannot reach the server. Please try again." }, { status: 502 });
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data?.access_token) {
    const detail = typeof data?.detail === "string" ? data.detail : "Wrong email, password or code.";
    return NextResponse.json({ detail }, { status: upstream.status === 429 ? 429 : upstream.ok ? 502 : upstream.status });
  }

  // The token goes into an httpOnly cookie only; the browser JS never sees it.
  const res = NextResponse.json({ admin: data.admin ?? null });
  setSessionCookie(res, data.access_token);
  return res;
}
