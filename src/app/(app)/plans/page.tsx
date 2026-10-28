"use client";
import { useState } from "react";
import { Button, Card, ConfirmDialog, Empty, ErrorBox, Loading, Modal, Notice, PageTitle, TextAreaField, TextField, useLoad } from "@/components/ui";
import { createPlan, listPlans, setPlanActive, updatePlan } from "@/lib/api";
import { formatPKR } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { hasErrors, type Errors } from "@/lib/validation";

type Field = "name" | "monthly" | "once";
const isMoney = (v: string) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0;

function PlanForm({ plan, onClose, onDone }: { plan: Plan | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(plan?.name ?? "");
  const [monthly, setMonthly] = useState(plan ? String(plan.monthly_price_pkr) : "");
  const [once, setOnce] = useState(plan ? String(plan.onetime_price_pkr) : "0");
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [errors, setErrors] = useState<Errors<Field>>({});
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Errors<Field> = {};
    if (!name.trim()) e.name = "Give the plan a name.";
    if (!isMoney(monthly)) e.monthly = "Enter the monthly price (0 or more).";
    if (!isMoney(once)) e.once = "Enter the one-time price (0 if none).";
    setErrors(e);
    if (hasErrors(e)) return;
    setBusy(true);
    try {
      const body = { name: name.trim(), monthly_price_pkr: Number(monthly), onetime_price_pkr: Number(once), notes: notes.trim() || undefined };
      if (plan) await updatePlan(plan.id, body);
      else await createPlan(body);
      onDone();
      onClose();
    } catch (err) {
      setServerErr((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={plan ? "Edit plan" : "New plan"} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {serverErr && <Notice kind="error">{serverErr}</Notice>}
        <TextField id="plan-name" label="Plan name" value={name} onChange={setName} error={errors.name} />
        <TextField id="plan-monthly" label="Monthly price (PKR)" value={monthly} onChange={setMonthly} inputMode="decimal" error={errors.monthly} />
        <TextField id="plan-once" label="One-time price (PKR)" value={once} onChange={setOnce} inputMode="decimal" error={errors.once} hint="For the offline edition. Use 0 if not sold this way." />
        <TextAreaField id="plan-notes" label="Notes (optional)" value={notes} onChange={setNotes} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Save plan</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function PlansPage() {
  const { data, error, loading, reload } = useLoad(listPlans, []);
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [toggling, setToggling] = useState<Plan | null>(null);

  return (
    <>
      <PageTitle title="Plans" hint="Plans are price tiers only. Every plan gets the full app." action={<Button onClick={() => setEditing("new")}>New plan</Button>} />
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="No plans yet" hint="Create your first price plan." action={<Button onClick={() => setEditing("new")}>New plan</Button>} />}
      {data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id} className={p.is_active ? "" : "opacity-70"}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-xl font-bold">{p.name}</h2>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${p.is_active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"}`}>{p.is_active ? "On" : "Disabled"}</span>
              </div>
              <p className="mt-3 text-slate-600">Monthly</p>
              <p className="text-2xl font-bold text-brand">{formatPKR(p.monthly_price_pkr)}</p>
              <p className="mt-2 text-slate-600">One-time: <span className="font-semibold text-slate-900">{formatPKR(p.onetime_price_pkr)}</span></p>
              {p.notes && <p className="mt-2 text-slate-600">{p.notes}</p>}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => setEditing(p)}>Edit</Button>
                <Button variant={p.is_active ? "danger" : "primary"} onClick={() => setToggling(p)}>{p.is_active ? "Disable" : "Enable"}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <PlanForm plan={editing === "new" ? null : editing} onClose={() => setEditing(null)} onDone={reload} />}
      {toggling && (
        <ConfirmDialog
          danger={toggling.is_active}
          title={`${toggling.is_active ? "Disable" : "Enable"} “${toggling.name}”?`}
          message={toggling.is_active ? "New businesses will not be able to pick this plan. Current customers keep it." : "This plan can be picked again."}
          confirmLabel={toggling.is_active ? "Yes, disable" : "Yes, enable"}
          onConfirm={async () => { await setPlanActive(toggling.id, !toggling.is_active); reload(); }}
          onClose={() => setToggling(null)}
        />
      )}
    </>
  );
}
