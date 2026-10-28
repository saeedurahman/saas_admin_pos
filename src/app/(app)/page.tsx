"use client";
import Link from "next/link";
import { useState } from "react";
import { RecordPaymentForm } from "@/components/RecordPaymentForm";
import { Button, Card, Empty, ErrorBox, Loading, PageTitle, StatusBadge, useLoad } from "@/components/ui";
import { getDashboard } from "@/lib/api";
import { daysLeftText, formatDate, formatPKR } from "@/lib/format";
import type { AttentionItem } from "@/lib/types";

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-slate-600">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useLoad(getDashboard, []);
  const [paying, setPaying] = useState<AttentionItem | null>(null);

  return (
    <>
      <PageTitle title="Dashboard" hint="A quick look at how your customers are doing." />
      {loading && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Stat label="Active" value={data.active} tone="text-green-700" />
            <Stat label="On trial" value={data.trial} tone="text-blue-700" />
            <Stat label="Expiring in 7 days" value={data.expiring_7d} tone="text-amber-700" />
            <Stat label="In grace period" value={data.grace} tone="text-amber-700" />
            <Stat label="Suspended" value={data.suspended} tone="text-red-700" />
            <Stat label="Payments this month" value={formatPKR(data.payments_this_month_pkr)} tone="text-brand" />
          </div>

          <Card title="Needs attention" className="mt-6">
            {data.needs_attention.length === 0 ? (
              <Empty title="All good" hint="No business is expiring soon or in grace period." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.needs_attention.map((b) => (
                  <li key={b.business_id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <Link href={`/businesses/${b.business_id}`} className="text-lg font-semibold text-brand hover:underline">
                        {b.name}
                      </Link>
                      <p className="text-slate-600">
                        {b.owner_phone ?? "No phone"} · Expires {formatDate(b.expires_at)} ({daysLeftText(b.days_left)})
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={b.status} />
                      <Button onClick={() => setPaying(b)}>Record payment</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
      {paying && <RecordPaymentForm businessId={paying.business_id} businessName={paying.name} onClose={() => setPaying(null)} onDone={reload} />}
    </>
  );
}
