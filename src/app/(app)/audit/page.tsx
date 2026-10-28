"use client";
import { useState } from "react";
import { AuditTable } from "@/components/AuditTable";
import { Card, Empty, ErrorBox, Loading, PageTitle, Pager, SelectField, TextField, useDebounced, useLoad } from "@/components/ui";
import { listAudit } from "@/lib/api";

const TYPES = [
  { value: "", label: "Everything" },
  { value: "business", label: "Businesses" },
  { value: "payment", label: "Payments" },
  { value: "plan", label: "Plans" },
  { value: "license", label: "Licenses" },
  { value: "settings", label: "Settings" },
  { value: "admin", label: "Admin users" },
];

export default function AuditPage() {
  const [admin, setAdmin] = useState("");
  const [action, setAction] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const dAdmin = useDebounced(admin);
  const dAction = useDebounced(action);

  const { data, error, loading, reload } = useLoad(
    () => listAudit({ admin: dAdmin, action: dAction, entity_type: type, date_from: from, date_to: to, page }),
    [dAdmin, dAction, type, from, to, page],
  );
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return (
    <>
      <PageTitle title="Activity log" hint="Everything admins have changed, with the values before and after." />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <TextField id="au-admin" label="Who (email)" value={admin} onChange={reset(setAdmin)} />
          <TextField id="au-action" label="What happened" value={action} onChange={reset(setAction)} placeholder="e.g. payment" />
          <SelectField id="au-type" label="About" value={type} onChange={reset(setType)} options={TYPES} />
          <TextField id="au-from" label="From date" type="date" value={from} onChange={reset(setFrom)} />
          <TextField id="au-to" label="To date" type="date" value={to} onChange={reset(setTo)} />
        </div>
      </Card>
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && data.items.length === 0 && <Empty title="Nothing found" hint="Try clearing some filters." />}
      {data && data.items.length > 0 && (
        <Card>
          <AuditTable rows={data.items} />
          <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
        </Card>
      )}
    </>
  );
}
