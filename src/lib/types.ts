// Shapes of the /platform/* contract the panel is built against.
// If the backend differs, adapt here and in api.ts only.

export type BusinessStatus = "trial" | "active" | "grace" | "expired" | "suspended" | "cancelled";
export type PaymentMethod = "jazzcash" | "easypaisa" | "bank" | "cash";
export type LicenseStatus = "issued" | "active" | "revoked";

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  is_active?: boolean;
  last_login_at?: string | null;
}

export interface AttentionItem {
  business_id: string;
  name: string;
  owner_phone: string | null;
  status: BusinessStatus;
  expires_at: string | null;
  days_left: number | null;
}

export interface DashboardData {
  active: number;
  trial: number;
  expiring_7d: number;
  grace: number;
  suspended: number;
  expired: number;
  cancelled: number;
  payments_this_month_pkr: number;
  needs_attention: AttentionItem[];
}

export interface BusinessRow {
  id: string;
  name: string;
  owner_phone: string | null;
  plan_name: string | null;
  plan_id: string | null;
  status: BusinessStatus;
  expires_at: string | null;
  days_left: number | null;
  branches: number;
  users: number;
  last_active_at: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  amount_pkr: number;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  period_months: number;
  period_start: string;
  period_end: string;
  recorded_by_email: string | null;
  created_at: string;
}

export interface AuditRow {
  id: string;
  created_at: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface NoteRow {
  id: string;
  text: string;
  created_at: string;
  admin_email: string;
}

export interface SubscriptionInfo {
  plan_id: string | null;
  plan_name: string | null;
  status: BusinessStatus;
  stored_status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  expires_at: string | null;
  days_left: number | null;
  in_grace: boolean;
}

export interface BusinessDetail {
  id: string;
  name: string;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  address: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
  branches: number;
  users: number;
  last_active_at: string | null;
  subscription: SubscriptionInfo;
  payments: PaymentRow[];
  recent_audit: AuditRow[];
  notes: NoteRow[];
}

export interface Plan {
  id: string;
  name: string;
  monthly_price_pkr: number;
  onetime_price_pkr: number;
  notes: string | null;
  is_active: boolean;
  business_count: number;
}

export interface LicenseRow {
  id: string;
  license_id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  machine_id: string;
  updates_until: string;
  status: LicenseStatus;
  transfer_count: number;
  key_string: string;
  issued_at: string;
}

export interface SupportSettings {
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;
  payment_instructions: string;
}

export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  last_login_at: string | null;
}

export interface TwoFactorSetup {
  totp_secret: string;
  provisioning_uri: string;
}

export interface AuditQuery {
  admin?: string;
  action?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
}
