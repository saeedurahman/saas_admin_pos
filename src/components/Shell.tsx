"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { goToLogin, logout } from "@/lib/api";
import { IdleGuard } from "./IdleGuard";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/businesses", label: "Businesses" },
  { href: "/plans", label: "Plans" },
  { href: "/licenses", label: "Licenses" },
  { href: "/audit", label: "Activity log" },
  { href: "/settings", label: "Settings" },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function signOut() {
    await logout();
    goToLogin();
  }

  const links = (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          aria-current={active(n.href) ? "page" : undefined}
          className={`rounded-xl px-4 py-3 text-lg font-semibold ${active(n.href) ? "bg-brand text-white" : "text-slate-700 hover:bg-slate-100"}`}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <IdleGuard />
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-xl font-bold text-brand">PakPOS Admin</span>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold">
          {open ? "Close" : "Menu"}
        </button>
      </header>
      {open && <div className="border-b border-slate-200 bg-white p-4 lg:hidden">{links}</div>}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 lg:flex">
        <div>
          <p className="mb-6 px-4 text-2xl font-bold text-brand">PakPOS Admin</p>
          {links}
        </div>
        <button type="button" onClick={signOut} className="min-h-12 rounded-xl border border-slate-300 px-4 text-lg font-semibold text-slate-700 hover:bg-slate-100">
          Sign out
        </button>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">
        {children}
        <div className="mt-10 lg:hidden">
          <button type="button" onClick={signOut} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 text-lg font-semibold text-slate-700">
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
}
