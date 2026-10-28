"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { BusinessStatus, LicenseStatus } from "@/lib/types";

// ── Buttons ────────────────────────────────────────────────────────────────
type Variant = "primary" | "secondary" | "danger" | "ghost";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-brand hover:bg-brand-light",
};

export function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  disabled,
  ...rest
}: { variant?: Variant; loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

// ── Layout bits ────────────────────────────────────────────────────────────
export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-lg font-bold text-slate-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
        {hint && <p className="mt-1 text-slate-600">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Status badges ──────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-green-100 text-green-800" },
  trial: { label: "On trial", cls: "bg-blue-100 text-blue-800" },
  grace: { label: "In grace period", cls: "bg-amber-100 text-amber-800" },
  expired: { label: "Expired", cls: "bg-slate-200 text-slate-700" },
  suspended: { label: "Suspended", cls: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", cls: "bg-slate-300 text-slate-800" },
  issued: { label: "Issued", cls: "bg-blue-100 text-blue-800" },
  revoked: { label: "Revoked", cls: "bg-red-100 text-red-800" },
};

export function StatusBadge({ status }: { status: BusinessStatus | LicenseStatus }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-slate-100 text-slate-700" };
  return <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${s.cls}`}>{s.label}</span>;
}

// ── Page states ────────────────────────────────────────────────────────────
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-slate-600">
      <span className="h-6 w-6 animate-spin rounded-full border-4 border-brand border-t-transparent" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1">{error}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <p className="text-lg font-semibold text-slate-800">{title}</p>
      {hint && <p className="mt-1 text-slate-600">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ kind, children }: { kind: "success" | "error"; children: ReactNode }) {
  const cls = kind === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`mb-4 rounded-xl border p-4 font-medium ${cls}`}>
      {children}
    </div>
  );
}

/** Load data on mount / when deps change, with loading + error + reload. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

// ── Form fields ────────────────────────────────────────────────────────────
const inputCls =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/20 aria-[invalid=true]:border-red-500";

export function Field({
  label,
  hint,
  error,
  id,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  children: (props: { id: string; className: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-semibold text-slate-800">
        {label}
      </label>
      {children({ id, className: inputCls, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField(props: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "tel" | "email" | "text";
  autoComplete?: string;
  maxLength?: number;
}) {
  const { label, id, value, onChange, error, hint, ...rest } = props;
  return (
    <Field label={label} id={id} error={error} hint={hint}>
      {(p) => <input {...p} {...rest} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export function SelectField({
  label,
  id,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <Field label={label} id={id} error={error}>
      {(p) => (
        <select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  id,
  value,
  onChange,
  error,
  hint,
  rows = 3,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <Field label={label} id={id} error={error} hint={hint}>
      {(p) => <textarea {...p} rows={rows} className={`${p.className} py-3`} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

// ── Dialogs ────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-2xl leading-none text-slate-500 hover:bg-slate-100">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={title} onClose={busy ? () => undefined : onClose}>
      <div className="text-slate-700">{message}</div>
      {error && (
        <div className="mt-4">
          <Notice kind="error">{error}</Notice>
        </div>
      )}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={go}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-slate-700">
      <span>
        {total} total · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
