// Server-only helpers for the Next route handlers (cookie + backend access).
import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "pakpos_admin_session";
export const IDLE_SECONDS = 30 * 60;
export const CSRF_HEADER = "x-requested-with";
export const CSRF_VALUE = "pakpos-admin";

export function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE is not set");
  return base.replace(/\/+$/, "");
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE !== "false" : process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: IDLE_SECONDS, // sliding: every proxied request re-issues it, so 30 idle minutes ends the session
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "strict" });
}

/**
 * CSRF defence for state-changing requests: the cookie is SameSite=Strict, and on top of that we
 * require a custom header (not sendable cross-site without CORS) and a same-origin Origin header.
 */
export function csrfOk(req: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  if (req.headers.get(CSRF_HEADER) !== CSRF_VALUE) return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
