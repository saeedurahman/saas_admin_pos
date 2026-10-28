"use client";
import Link from "next/link";
import { use, useState } from "react";
import { AuditTable } from "@/components/AuditTable";
import { RecordPaymentForm } from "@/components/RecordPaymentForm";
import {
  Button, Card, ConfirmDialog, Empty, ErrorBox, Loading, Modal, Notice, PageTitle, SelectField, StatusBadge, TextAreaField, TextField, useLoad,
} from "@/components/ui";
import { activateBusiness, addNote, changePlan, extendDays, getBusiness, listPlans, suspendBusiness } from "@/lib/api";
import { daysLeftText, formatDate, formatDateTime, formatPKR } from "@/lib/format";
import { isPositiveInt } from "@/lib/validation";

const METHOD_LABEL: Record<string, string> = { jazzcash: "JazzCash", easypaisa: "EasyPaisa", bank: "Bank transfer", cash: "Cash" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-slate-600">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function ExtendDialog({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState("7");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string>();
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!isPositiveInt(days) || Number(days) > 366) return setErr("Enter a number of days between 1 and 366.");
    setErr(undefined);
    setBusy(true);
    try {
      await extendDays(id, Number(days), note.trim() || undefined);
      onDone();
      onClose();
    } catch (e) {
      setServerErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Extend by days" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {serverErr && <Notice kind="error">{serverErr}</Notice>}
        <TextField id="ext-days" label="Number of days to add" value={days} onChange={setDays} inputMode="numeric" error={err} />
        <TextAreaField id="ext-note" label="Reason (optional)" value={note} onChange={setNote} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Add days</Button>
        </div>
      </form>
    </Modal>
  );
}

function PlanDialog({ id, currentPlanId, onClose, onDone }: { id: string; currentPlanId: string | null; onClose: () => void; onDone: () => void }) {
  const plans = useLoad(listPlans, []);
  const [planId, setPlanId] = useState(currentPlanId ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!planId) return setErr("Choose a plan.");
    setBusy(true);
    try {
      await changePlan(id, planId);
      onDone();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Change plan" onClose={onClose}>
      {plans.loading && <Loading />}
      {plans.error && <ErrorBox error={plans.error} onRetry={plans.reload} />}
      {plans.data && (
        <div className="space-y-4">
          {err && <Notice kind="error">{err}</Notice>}
          <SelectField
            id="chg-plan"
            label="Plan"
            value={planId}
            onChange={setPlanId}
            options={[{ value: "", label: "Choose a plan…" }, ...plans.data.filter((p) => p.is_active || p.id === currentPlanId).map((p) => ({ value: p.id, label: `${p.name} — ${formatPKR(p.monthly_price_pkr)}/month` }))]}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={busy} onClick={save}>Save plan</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: b, error, loading, reload } = useLoad(() => getBusiness(id), [id]);
  const [dialog, setDialog] = useState<"pay" | "extend" | "plan" | "suspend" | "activate" | null>(null);
  const [note, setNote] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteErr, setNoteErr] = useState<string | null>(null);

  async function saveNote() {
    if (!note.trim()) return setNoteErr("Write a note first.");
    setNoteBusy(true);
    setNoteErr(null);
    try {
      await addNote(id, note.trim());
      setNote("");
      reload();
    } catch (e) {
      setNoteErr((e as Error).message);
    } finally {
      setNoteBusy(false);
    }
  }

  if (loading && !b) return <Loading />;
  if (error && !b) return <ErrorBox error={error} onRetry={reload} />;
  if (!b) return null;
  const sub = b.subscription;
  const suspended = sub.stored_status === "suspended" || sub.stored_status === "cancelled";

  return (
    <>
      <Link href="/businesses" className="mb-3 inline-block font-semibold text-brand hover:underline">← All businesses</Link>
      <PageTitle title={b.name} hint={b.address ?? undefined} action={<StatusBadge status={sub.status} />} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Business info">
          <dl>
            <Row label="Owner" value={b.owner_name ?? "—"} />
            <Row label="Owner phone" value={b.owner_phone ?? "—"} />
            <Row label="Owner email" value={b.owner_email ?? "—"} />
            <Row label="Branches" value={b.branches} />
            <Row label="Users" value={b.users} />
            <Row label="Joined" value={formatDate(b.created_at)} />
            <Row label="Last active" value={formatDateTime(b.last_active_at)} />
          </dl>
        </Card>

        <Card title="Subscription">
          <dl>
            <Row label="Status" value={<StatusBadge status={sub.status} />} />
            <Row label="Plan" value={sub.plan_name ?? "—"} />
            <Row label="Expires on" value={formatDate(sub.expires_at)} />
            <Row label="Time left" value={daysLeftText(sub.days_left)} />
          </dl>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setDialog("pay")}>Record payment</Button>
            <Button variant="secondary" onClick={() => setDialog("extend")}>Extend days</Button>
            <Button variant="secondary" onClick={() => setDialog("plan")}>Change plan</Button>
            {suspended ? (
              <Button onClick={() => setDialog("activate")}>Activate</Button>
            ) : (
              <Button variant="danger" onClick={() => setDialog("suspend")}>Suspend</Button>
            )}
          </div>
        </Card>
      </div>

      <Card title="Payment history" className="mt-6">
        {b.payments.length === 0 ? (
          <Empty title="No payments yet" hint="Use “Record payment” when this business pays." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-600">
                  {["Date", "Amount", "Paid by", "Reference", "Months", "Note"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {b.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-3">{formatDateTime(p.created_at)}</td>
                    <td className="px-3 py-3 font-semibold">{formatPKR(p.amount_pkr)}</td>
                    <td className="px-3 py-3">{METHOD_LABEL[p.method] ?? p.method}</td>
                    <td className="px-3 py-3">{p.reference ?? "—"}</td>
                    <td className="px-3 py-3">{p.period_months}</td>
                    <td className="px-3 py-3">{p.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Internal notes" className="mt-6">
        <p className="mb-3 text-slate-600">Only admins can see these notes.</p>
        <TextAreaField id="note" label="Add a note" value={note} onChange={setNote} error={noteErr ?? undefined} />
        <Button className="mt-3" loading={noteBusy} onClick={saveNote}>Save note</Button>
        {b.notes.length === 0 ? (
          <p className="mt-4 text-slate-500">No notes yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {b.notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-slate-50 p-4">
                <p className="whitespace-pre-wrap">{n.text}</p>
                <p className="mt-1 text-sm text-slate-500">{n.admin_email} · {formatDateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent activity" className="mt-6">
        {b.recent_audit.length === 0 ? <Empty title="No activity yet" /> : <AuditTable rows={b.recent_audit} compact />}
      </Card>

      {dialog === "pay" && <RecordPaymentForm businessId={b.id} businessName={b.name} onClose={() => setDialog(null)} onDone={reload} />}
      {dialog === "extend" && <ExtendDialog id={b.id} onClose={() => setDialog(null)} onDone={reload} />}
      {dialog === "plan" && <PlanDialog id={b.id} currentPlanId={sub.plan_id} onClose={() => setDialog(null)} onDone={reload} />}
      {dialog === "suspend" && (
        <ConfirmDialog
          danger
          title={`Suspend ${b.name}?`}
          message="This shop will not be able to use the app until you activate it again. Their data is kept safe."
          confirmLabel="Yes, suspend"
          onConfirm={async () => { await suspendBusiness(b.id); reload(); }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "activate" && (
        <ConfirmDialog
          title={`Activate ${b.name}?`}
          message="This shop will be able to use the app again."
          confirmLabel="Yes, activate"
          onConfirm={async () => { await activateBusiness(b.id); reload(); }}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
