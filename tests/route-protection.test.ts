// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { buildCsp, middleware } from "@/middleware";
import { csrfOk, SESSION_COOKIE } from "@/lib/server";

const req = (path: string, opts: { cookie?: boolean } = {}) =>
  new NextRequest(`http://localhost:3100${path}`, {
    headers: opts.cookie ? { cookie: `${SESSION_COOKIE}=tok` } : {},
  });

describe("route protection", () => {
  it.each(["/", "/businesses", "/businesses/123", "/licenses", "/settings", "/audit"])("redirects %s to /login without a session", (p) => {
    const res = middleware(req(p));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("lets the login page through when signed out", () => {
    expect(middleware(req("/login")).headers.get("location")).toBeNull();
  });

  it("sends a signed-in admin away from /login", () => {
    expect(new URL(middleware(req("/login", { cookie: true })).headers.get("location")!).pathname).toBe("/");
  });

  it("serves protected pages with a session, with CSP and no-store", () => {
    const res = middleware(req("/businesses", { cookie: true }));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("production CSP has no unsafe-eval and only same-origin connections", () => {
    const csp = buildCsp("abc", false);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("'nonce-abc'");
  });
});

describe("CSRF check", () => {
  const post = (headers: Record<string, string>) =>
    csrfOk(new NextRequest("http://localhost:3100/api/proxy/platform/plans", { method: "POST", headers: { host: "localhost:3100", ...headers } }));

  it("allows same-origin requests carrying the custom header", () => {
    expect(post({ "x-requested-with": "pakpos-admin", origin: "http://localhost:3100" })).toBe(true);
  });
  it("blocks a missing header, a foreign origin, or no origin", () => {
    expect(post({ origin: "http://localhost:3100" })).toBe(false);
    expect(post({ "x-requested-with": "pakpos-admin", origin: "https://evil.example" })).toBe(false);
    expect(post({ "x-requested-with": "pakpos-admin" })).toBe(false);
  });
});
