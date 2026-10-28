"use client";
import { useState } from "react";
import { recordPayment } from "@/lib/api";
import { formatPKR } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { hasErrors, isPositiveInt, isPositiveNumber, type Errors } from "@/lib/validation";
import { Button, Modal, Notice, SelectField, TextAreaField, TextField } from "./ui";

const METHODS = [
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "bank", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
];

type Field = "amount" | "reference" | "months";

/** "Record payment" dialog: used from the dashboard list and the business page. */
export function RecordPaymentForm({
  businessId,
  businessName,
  onClose,
  onDone,
}: {
  businessId: string;
  businessName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("jazzcash");
  const [reference, setReference] = useState("");
  const [months, setMonths] = useState("1");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors<Field>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): Errors<Field> {
    const e: Errors<Field> = {};
    if (!isPositiveNumber(amount)) e.amount = "Enter the amount received, for example 3000.";
    if (!isPositiveInt(months) || Number(months) > 36) e.months = "Enter how many months this pays for (1 to 36).";
    if (method !== "cash" && !reference.trim()) e.reference = "Enter the transaction ID or reference number.";
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerError(null);
    const e = validate();
    setErrors(e);
    if (hasErrors(e)) return;
    setBusy(true);
    try {
      await recordPayment(businessId, {
        amount_pkr: Number(amount),
        method,
        reference: reference.trim() || undefined,
        period_months: Number(months),
        note: note.trim() || undefined,
      });
      onDone();
      onClose();
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Record payment — ${businessName}`} onClose={busy ? () => undefined : onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {serverError && <Notice kind="error">{serverError}</Notice>}
        <TextField id="pay-amount" label="Amount received (PKR)" value={amount} onChange={setAmount} inputMode="decimal" error={errors.amount} hint={Number(amount) > 0 ? formatPKR(amount) : undefined} />
        <SelectField id="pay-method" label="Paid by" value={method} onChange={(v) => setMethod(v as PaymentMethod)} options={METHODS} />
        <TextField id="pay-ref" label="Transaction ID / reference" value={reference} onChange={setReference} error={errors.reference} hint={method === "cash" ? "Optional for cash." : undefined} />
        <TextField id="pay-months" label="Months paid for" value={months} onChange={setMonths} inputMode="numeric" error={errors.months} hint="The expiry date moves forward by this many months." />
        <TextAreaField id="pay-note" label="Note (optional)" value={note} onChange={setNote} />
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Save payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
