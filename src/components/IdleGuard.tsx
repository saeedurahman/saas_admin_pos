"use client";
import { useEffect } from "react";
import { goToLogin, logout, ping } from "@/lib/api";

const IDLE_MS = 30 * 60 * 1000;
const KEEPALIVE_MS = 5 * 60 * 1000;

/** Signs the admin out after 30 idle minutes; while active it renews the server-side session. */
export function IdleGuard() {
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;
    let lastPing = Date.now();

    const expire = async () => {
      await logout();
      goToLogin();
    };
    const reset = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(expire, IDLE_MS);
      if (Date.now() - lastPing > KEEPALIVE_MS) {
        lastPing = Date.now();
        ping().then((s) => s === 401 && goToLogin());
      }
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(idleTimer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);
  return null;
}
