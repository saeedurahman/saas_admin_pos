"use client";
import { useState } from "react";
import {
  Button,
  Card,
  ConfirmDialog,
  Empty,
  ErrorBox,
  Loading,
  Modal,
  Notice,
  PageTitle,
  Pager,
  SelectField,
  StatusBadge,
  TextField,
  useDebounced,
  useLoad,
} from "@/components/ui";
import { downloadLicenseFile, extendLicenseUpdates, issueLicense, listLicenses, revokeLicense, transferLicense } from "@/lib/api";
import { formatDate, todayKarachi } from "@/lib/format";
import type { LicenseRow } from "@/lib/types";
import { hasErrors, isEmail, isPhone, type Errors } from "@/lib/validation";

const STATUSES = [
  { value: "", label: "All licenses" },
  { value: "active", label: "Active" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Updates ended" },
];
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

function IssueForm({ onClose, onDone }: { onClose: () => void; onDone: (l: LicenseRow) => void }) {
  const [f, setF] = useState({ customer_name: "", phone: "", email: "", machine_id: "", updates_until: "" });
  const [errors, setErrors] = useState<Errors<keyof typeof f>>({});
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Errors<keyof typeof f> = {};
    if (!f.customer_name.trim()) e.customer_name = "Enter the customer's name.";
    if (f.phone.trim() && !isPhone(f.phone)) e.phone = "Enter a valid phone number.";
    if (f.email.trim() && !isEmail(f.email)) e.email = "Enter a valid email address.";
    if (f.machine_id.trim().length < 6) e.machine_id = "Paste the machine ID the customer sent you.";
    if (!isDate(f.updates_until) || f.updates_until < todayKarachi()) e.updates_until = "Pick a date in the future.";
    setErrors(e);
    if (hasErrors(e)) return;
    setBusy(true);
    setServerErr(null);
    try {
      const lic = await issueLicense({
        customer_name: f.customer_name.trim(),
        phone: f.phone.trim() || undefined,
        email: f.email.trim() || undefined,
        machine_id: f.machine_id.trim(),
        updates_until: f.updates_until,
      });
      onDone(lic);
    } catch (err) {
      setServerErr((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Issue a new license" onClose={busy ? () => undefined : onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {serverErr && <Notice kind="error">{serverErr}</Notice>}
        <TextField id="lic-name" label="Customer name" value={f.customer_name} onChange={set("customer_name")} error={errors.customer_name} />
        <TextField id="lic-phone" label="Phone (optional)" value={f.phone} onChange={set("phone")} inputMode="tel" error={errors.phone} />
        <TextField id="lic-email" label="Email (optional)" value={f.email} onChange={set("email")} inputMode="email" error={errors.email} />
        <TextField id="lic-machine" label="Machine ID" value={f.machine_id} onChange={set("machine_id")} error={errors.machine_id} hint="The customer finds this in the app on their computer." />
        <TextField id="lic-until" label="Free updates until" type="date" value={f.updates_until} onChange={set("updates_until")} error={errors.updates_until} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Issue license</Button>
        </div>
      </form>
    </Modal>
  );
}

function TransferForm({ lic, onClose, onDone }: { lic: LicenseRow; onClose: () => void; onDone: (replacement: LicenseRow) => void }) {
  const [machine, setMachine] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (machine.trim().length < 6) return setErr("Paste the new machine ID.");
    setErr(undefined);
    setBusy(true);
    try {
      const result = await transferLicense(lic.id, machine.trim());
      onDone(result.new);
      onClose();
    } catch (e) {
      setServerErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Move license — ${lic.customer_name}`} onClose={busy ? () => undefined : onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {serverErr && <Notice kind="error">{serverErr}</Notice>}
        <p className="text-slate-700">The old computer will stop working. You must send the customer a new license file.</p>
        <TextField id="tr-machine" label="New machine ID" value={machine} onChange={setMachine} error={err} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Move license</Button>
        </div>
      </form>
    </Modal>
  );
}

function ExtendForm({ lic, onClose, onDone }: { lic: LicenseRow; onClose: () => void; onDone: () => void }) {
  const [until, setUntil] = useState(lic.updates_until.slice(0, 10));
  const [err, setErr] = useState<string | undefined>();
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!isDate(until) || until <= lic.updates_until.slice(0, 10)) return setErr("Pick a date after the current one.");
    setErr(undefined);
    setBusy(true);
    try {
      await extendLicenseUpdates(lic.id, until);
      onDone();
      onClose();
    } catch (e) {
      setServerErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Extend updates — ${lic.customer_name}`} onClose={busy ? () => undefined : onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {serverErr && <Notice kind="error">{serverErr}</Notice>}
        <p className="text-slate-700">Currently valid until {formatDate(lic.updates_until)}.</p>
        <TextField id="ext-until" label="New date" type="date" value={until} onChange={setUntil} error={err} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function KeyDialog({ lic, onClose }: { lic: LicenseRow; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(lic.key_string);
      setCopied(true);
    } catch {
      setError("Could not copy. Select the text and copy it by hand.");
    }
  }
  async function download() {
    setError(null);
    try {
      const blob = await downloadLicenseFile(lic.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "license.txt";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal title={`License key — ${lic.customer_name}`} onClose={onClose}>
      {error && <Notice kind="error">{error}</Notice>}
      <textarea readOnly rows={5} value={lic.key_string} aria-label="License key" onFocus={(e) => e.currentTarget.select()} className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-sm break-all" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" onClick={copy}>{copied ? "Copied ✓" : "Copy key"}</Button>
        <Button onClick={download}>Download license.txt</Button>
      </div>
    </Modal>
  );
}

export default function LicensesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { data, error, loading, reload } = useLoad(() => listLicenses({ search: q, status, page }), [q, status, page]);

  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<LicenseRow | null>(null);
  const [viewing, setViewing] = useState<LicenseRow | null>(null);
  const [revoking, setRevoking] = useState<LicenseRow | null>(null);
  const [transfer, setTransfer] = useState<LicenseRow | null>(null);
  const [extend, setExtend] = useState<LicenseRow | null>(null);

  return (
    <>
      <PageTitle title="Licenses" hint="One-time offline edition. Each license works on one computer." action={<Button onClick={() => setIssuing(true)}>Issue license</Button>} />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField id="lic-search" label="Search" value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Name, phone, email or machine ID" />
          <SelectField id="lic-status" label="Show" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUSES} />
        </div>
      </Card>

      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && data.items.length === 0 && <Empty title="No licenses found" hint={q || status ? "Try a different search." : "Issue the first license to get started."} />}
      {data && data.items.length > 0 && (
        <>
          <div className="space-y-3">
            {data.items.map((l) => (
              <Card key={l.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-bold">{l.customer_name}</p>
                    <p className="text-slate-600">{[l.phone, l.email].filter(Boolean).join(" · ") || "No contact details"}</p>
                    <p className="mt-1 break-all font-mono text-sm text-slate-500">Machine: {l.machine_id}</p>
                    <p className="text-slate-600">Updates until {formatDate(l.updates_until)} · issued {formatDate(l.issued_at)}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <Button variant="secondary" onClick={() => setViewing(l)}>View key</Button>
                  <Button variant="secondary" disabled={l.status === "revoked"} onClick={() => setExtend(l)}>Extend updates</Button>
                  <Button variant="secondary" disabled={l.status === "revoked"} onClick={() => setTransfer(l)}>New computer</Button>
                  <Button variant="danger" disabled={l.status === "revoked"} onClick={() => setRevoking(l)}>Revoke</Button>
                </div>
              </Card>
            ))}
          </div>
          <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
        </>
      )}

      {issuing && <IssueForm onClose={() => setIssuing(false)} onDone={(l) => { setIssuing(false); setIssued(l); reload(); }} />}
      {issued && <KeyDialog lic={issued} onClose={() => setIssued(null)} />}
      {viewing && <KeyDialog lic={viewing} onClose={() => setViewing(null)} />}
      {transfer && <TransferForm lic={transfer} onClose={() => setTransfer(null)} onDone={(replacement) => { reload(); setIssued(replacement); }} />}
      {extend && <ExtendForm lic={extend} onClose={() => setExtend(null)} onDone={reload} />}
      {revoking && (
        <ConfirmDialog
          danger
          title={`Revoke license for ${revoking.customer_name}?`}
          message="The software on their computer will stop working. This cannot be undone."
          confirmLabel="Yes, revoke"
          onConfirm={async () => { await revokeLicense(revoking.id); reload(); }}
          onClose={() => setRevoking(null)}
        />
      )}
    </>
  );
}
