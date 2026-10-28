// The single typed client for the PakPOS /platform/* API.
// The browser never talks to the backend directly: every call goes to /api/proxy/*, a Next route
// handler that adds the httpOnly session cookie as a Bearer token. Adapt paths/shapes here.
import type {
  AdminAccount,
  AuditQuery,
  AuditRow,
  BusinessDetail,
  BusinessRow,
  DashboardData,
  LicenseRow,
  NoteRow,
  Paged,
  PaymentMethod,
  Plan,
  SupportSettings,
  TwoFactorSetup,
} from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function message(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === "string" ? d : (d?.msg ?? ""))).filter(Boolean).join(". ") || fallback;
  }
  return fallback;
}

export function goToLogin() {
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.assign("/login?expired=1");
  }
}

async function raw(method: string, path: string, body?: unknown): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`/api/proxy/${path.replace(/^\/+/, "")}`, {
      method,
      headers: {
        "x-requested-with": "pakpos-admin",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your internet and try again.");
  }
  if (res.status === 401) {
    goToLogin(); // auto logout
    throw new ApiError(401, "Your session has ended. Please sign in again.");
  }
  return res;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await raw(method, path, body);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const fallback = res.status >= 500 ? "Something went wrong on the server. Please try again." : "The request was not accepted.";
    throw new ApiError(res.status, message((data as { detail?: unknown } | null)?.detail, fallback));
  }
  return data as T;
}

const qs = (params: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

// ── Auth (own route handlers, not the proxy) ────────────────────────────────
export async function login(email: string, password: string, totp_code: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-requested-with": "pakpos-admin" },
    body: JSON.stringify({ email, password, totp_code }),
  }).catch(() => null);
  if (!res) throw new ApiError(0, "Cannot reach the server. Check your internet and try again.");
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, message(data?.detail, "Sign in failed."));
  return data as { admin: { id: string; email: string; name: string } };
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST", headers: { "x-requested-with": "pakpos-admin" } }).catch(() => null);
}

export const ping = () => fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.status);

// ── Dashboard ───────────────────────────────────────────────────────────────
export const getDashboard = () => request<DashboardData>("GET", "platform/dashboard");

// ── Businesses ──────────────────────────────────────────────────────────────
export interface BusinessQuery {
  search?: string;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}
export const listBusinesses = (q: BusinessQuery) => request<Paged<BusinessRow>>("GET", `platform/businesses${qs({ ...q })}`);
export const getBusiness = (id: string) => request<BusinessDetail>("GET", `platform/businesses/${id}`);

export interface PaymentInput {
  amount_pkr: number;
  method: PaymentMethod;
  reference?: string;
  period_months: number;
  note?: string;
}
export const recordPayment = (id: string, b: PaymentInput) => request<unknown>("POST", `platform/businesses/${id}/payments`, b);
export const extendDays = (id: string, days: number, note?: string) =>
  request<unknown>("PATCH", `platform/businesses/${id}/subscription`, { extend_days: days, note });
export const changePlan = (id: string, plan_id: string) => request<unknown>("PATCH", `platform/businesses/${id}/subscription`, { plan_id });
export const suspendBusiness = (id: string, reason?: string) => request<unknown>("POST", `platform/businesses/${id}/suspend`, { reason });
export const activateBusiness = (id: string) => request<unknown>("POST", `platform/businesses/${id}/activate`, {});
export const addNote = (id: string, text: string) => request<NoteRow>("POST", `platform/businesses/${id}/notes`, { text });

// ── Plans ───────────────────────────────────────────────────────────────────
export interface PlanInput {
  name: string;
  monthly_price_pkr: number;
  onetime_price_pkr: number;
  notes?: string;
}
export const listPlans = () => request<Plan[]>("GET", "platform/plans");
export const createPlan = (b: PlanInput) => request<Plan>("POST", "platform/plans", b);
export const updatePlan = (id: string, b: PlanInput) => request<Plan>("PUT", `platform/plans/${id}`, b);
export const setPlanActive = (id: string, active: boolean) => request<Plan>("POST", `platform/plans/${id}/${active ? "enable" : "disable"}`, {});

// ── Licenses ────────────────────────────────────────────────────────────────
export interface LicenseInput {
  customer_name: string;
  phone?: string;
  email?: string;
  machine_id: string;
  updates_until: string;
}
export const listLicenses = (q: { search?: string; status?: string; page?: number }) =>
  request<Paged<LicenseRow>>("GET", `platform/licenses${qs(q)}`);
export const issueLicense = (b: LicenseInput) => request<LicenseRow>("POST", "platform/licenses", b);
export const revokeLicense = (id: string) => request<LicenseRow>("POST", `platform/licenses/${id}/revoke`, {});
export const transferLicense = (id: string, machine_id: string) =>
  request<{ old: LicenseRow; new: LicenseRow }>("POST", `platform/licenses/${id}/transfer`, { machine_id });
export const extendLicenseUpdates = (id: string, updates_until: string) =>
  request<LicenseRow>("POST", `platform/licenses/${id}/extend-updates`, { updates_until });
export async function downloadLicenseFile(id: string): Promise<Blob> {
  const res = await raw("GET", `platform/licenses/${id}/file`);
  if (!res.ok) throw new ApiError(res.status, "Could not prepare the license file.");
  return res.blob();
}

// ── Settings & admins ───────────────────────────────────────────────────────
export const getSettings = () => request<SupportSettings>("GET", "platform/settings");
export const saveSettings = (b: SupportSettings) => request<SupportSettings>("PUT", "platform/settings", b);
export const listAdmins = () => request<AdminAccount[]>("GET", "platform/admins");
export const createAdmin = (b: { email: string; name: string; password: string }) =>
  request<{ admin: AdminAccount } & TwoFactorSetup>("POST", "platform/admins", b);
export const setAdminActive = (id: string, active: boolean) => request<AdminAccount>("POST", `platform/admins/${id}/${active ? "enable" : "disable"}`, {});
export const resetAdmin2fa = (id: string) => request<TwoFactorSetup>("POST", `platform/admins/${id}/reset-2fa`, {});

// ── Audit ───────────────────────────────────────────────────────────────────
export const listAudit = (q: AuditQuery) => request<Paged<AuditRow>>("GET", `platform/audit${qs({ ...q })}`);
