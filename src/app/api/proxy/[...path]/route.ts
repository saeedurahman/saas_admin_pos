import { NextRequest, NextResponse } from "next/server";
import { apiBase, clearSessionCookie, csrfOk, SESSION_COOKIE, setSessionCookie } from "@/lib/server";

// Authenticated pass-through to {API_BASE}/platform/*. Only /platform/ paths are reachable.
async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!csrfOk(req)) return NextResponse.json({ detail: "Request blocked." }, { status: 403 });

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: "Not signed in." }, { status: 401 });

  const { path } = await ctx.params;
  if (path[0] !== "platform" || path.some((p) => p === ".." || p === "." || p.includes("\\"))) {
    return NextResponse.json({ detail: "Not found." }, { status: 404 });
  }

  const url = `${apiBase()}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const hasBody = !["GET", "HEAD"].includes(req.method);
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(hasBody ? { "content-type": req.headers.get("content-type") ?? "application/json" } : {}),
      },
      body: hasBody ? await req.text() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Cannot reach the server. Please try again." }, { status: 502 });
  }

  const headers = new Headers();
  for (const h of ["content-type", "content-disposition"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  const res = new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers });
  if (upstream.status === 401) clearSessionCookie(res);
  else setSessionCookie(res, token); // sliding idle window
  return res;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
