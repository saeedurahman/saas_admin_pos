"use client";
import { useEffect, useState } from "react";
import { Button, Card, ConfirmDialog, Empty, ErrorBox, Loading, Modal, Notice, PageTitle, TextAreaField, TextField, useLoad } from "@/components/ui";
import { createAdmin, getSettings, listAdmins, resetAdmin2fa, saveSettings, setAdminActive } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { AdminAccount, SupportSettings, TwoFactorSetup } from "@/lib/types";
import { hasErrors, isEmail, isPhone, type Errors } from "@/lib/validation";

function SupportCard() {
  const { data, error, loading, reload } = useLoad(getSettings, []);
  const [f, setF] = useState<SupportSettings>({ contact_phone: "", contact_whatsapp: "", contact_email: "", payment_instructions: "" });
  const [errors, setErrors] = useState<Errors<keyof SupportSettings>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  useEffect(() => { if (data) setF(data); }, [data]);
  const set = (k: keyof SupportSettings) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Errors<keyof SupportSettings> = {};
    if (f.contact_phone.trim() && !isPhone(f.contact_phone)) e.contact_phone = "Enter a valid phone number.";
    if (f.contact_whatsapp.trim() && !isPhone(f.contact_whatsapp)) e.contact_whatsapp = "Enter a valid WhatsApp number.";
    if (f.contact_email.trim() && !isEmail(f.contact_email)) e.contact_email = "Enter a valid email address.";
    setErrors(e);
    if (hasErrors(e)) return;
    setBusy(true);
    setMsg(null);
    try {
      await saveSettings({ ...f, contact_phone: f.contact_phone.trim(), contact_whatsapp: f.contact_whatsapp.trim(), contact_email: f.contact_email.trim() });
      setMsg({ kind: "success", text: "Saved. Clients will see the new details in the app." });
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Help shown to clients in the app">
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (
        <form onSubmit={submit} noValidate className="space-y-4">
          {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="s-phone" label="Support phone" value={f.contact_phone} onChange={set("contact_phone")} inputMode="tel" error={errors.contact_phone} />
            <TextField id="s-wa" label="WhatsApp number" value={f.contact_whatsapp} onChange={set("contact_whatsapp")} inputMode="tel" error={errors.contact_whatsapp} />
          </div>
          <TextField id="s-email" label="Support email" value={f.contact_email} onChange={set("contact_email")} inputMode="email" error={errors.contact_email} />
          <TextAreaField id="s-pay" label="How to pay (shown to clients)" rows={5} value={f.payment_instructions} onChange={set("payment_instructions")} hint="For example your JazzCash and bank account details." />
          <Button type="submit" loading={busy}>Save</Button>
        </form>
      )}
    </Card>
  );
}

function AddAdmin({ onClose, onDone }: { onClose: () => void; onDone: (setup: TwoFactorSetup) => void }) {
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors<keyof typeof f>>({});
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Errors<keyof typeof f> = {};
    if (!f.name.trim()) e.name = "Enter a name.";
    if (!isEmail(f.email)) e.email = "Enter a valid email address.";
    if (f.password.length < 10) e.password = "Use at least 10 characters.";
    setErrors(e);
    if (hasErrors(e)) return;
    setBusy(true);
    try {
      const created = await createAdmin({ name: f.name.trim(), email: f.email.trim(), password: f.password });
      onDone({ totp_secret: created.totp_secret, provisioning_uri: created.provisioning_uri });
      onClose();
    } catch (err) {
      setServerErr((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Add admin" onClose={busy ? () => undefined : onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {serverErr && <Notice kind="error">{serverErr}</Notice>}
        <TextField id="ad-name" label="Name" value={f.name} onChange={set("name")} error={errors.name} />
        <TextField id="ad-email" label="Email" value={f.email} onChange={set("email")} inputMode="email" error={errors.email} />
        <TextField id="ad-pass" label="Starting password" type="password" value={f.password} onChange={set("password")} error={errors.password} autoComplete="new-password" hint="They will set up their 6-digit code on first sign-in." />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Add admin</Button>
        </div>
      </form>
    </Modal>
  );
}

function AdminsCard() {
  const { data, error, loading, reload } = useLoad(listAdmins, []);
  const [adding, setAdding] = useState(false);
  const [toggle, setToggle] = useState<AdminAccount | null>(null);
  const [reset, setReset] = useState<AdminAccount | null>(null);
  const [resetInfo, setResetInfo] = useState<TwoFactorSetup | null>(null);

  return (
    <Card title="Admin users" action={<Button onClick={() => setAdding(true)}>Add admin</Button>}>
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="No admins" />}
      {data && data.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {data.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="font-semibold">{a.name} {!a.is_active && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-sm">Disabled</span>}</p>
                <p className="break-all text-slate-600">{a.email}</p>
                <p className="text-sm text-slate-500">Last sign-in: {formatDateTime(a.last_login_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setReset(a)}>Reset 6-digit code</Button>
                <Button variant={a.is_active ? "danger" : "primary"} onClick={() => setToggle(a)}>{a.is_active ? "Disable" : "Enable"}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {adding && <AddAdmin onClose={() => setAdding(false)} onDone={(setup) => { reload(); setResetInfo(setup); }} />}
      {toggle && (
        <ConfirmDialog
          danger={toggle.is_active}
          title={`${toggle.is_active ? "Disable" : "Enable"} ${toggle.name}?`}
          message={toggle.is_active ? "They will not be able to sign in." : "They will be able to sign in again."}
          confirmLabel={toggle.is_active ? "Yes, disable" : "Yes, enable"}
          onConfirm={async () => { await setAdminActive(toggle.id, !toggle.is_active); reload(); }}
          onClose={() => setToggle(null)}
        />
      )}
      {reset && (
        <ConfirmDialog
          danger
          title={`Reset the 6-digit code for ${reset.name}?`}
          message="Their current authenticator app will stop working. They must set it up again."
          confirmLabel="Yes, reset"
          onConfirm={async () => { setResetInfo(await resetAdmin2fa(reset.id)); reload(); }}
          onClose={() => setReset(null)}
        />
      )}
      {resetInfo && (
        <Modal title="Code reset" onClose={() => setResetInfo(null)}>
          <p className="text-slate-700">Give this to the admin to add to their authenticator app. It is shown only once.</p>
          <p className="mt-3 text-sm font-semibold text-slate-600">Setup key</p>
          <p className="break-all rounded-xl bg-slate-50 p-3 font-mono">{resetInfo.totp_secret}</p>
          <p className="mt-3 text-sm font-semibold text-slate-600">Or open this link on their phone</p>
          <p className="break-all rounded-xl bg-slate-50 p-3 font-mono text-sm">{resetInfo.provisioning_uri}</p>
          <Button className="mt-4 w-full" onClick={() => setResetInfo(null)}>Close</Button>
        </Modal>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageTitle title="Settings" />
      <div className="space-y-6">
        <SupportCard />
        <AdminsCard />
      </div>
    </>
  );
}
