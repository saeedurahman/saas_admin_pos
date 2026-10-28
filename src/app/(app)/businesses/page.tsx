"use client";
import Link from "next/link";
import { useState } from "react";
import { Card, Empty, ErrorBox, Loading, PageTitle, Pager, SelectField, StatusBadge, TextField, useDebounced, useLoad } from "@/components/ui";
import { listBusinesses } from "@/lib/api";
import { daysLeftText, formatDate, formatDateTime } from "@/lib/format";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "trial", label: "On trial" },
  { value: "grace", label: "In grace period" },
  { value: "expired", label: "Expired" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
];
const SORT_OPTIONS = [
  { value: "name:asc", label: "Name (A to Z)" },
  { value: "expires_at:asc", label: "Expiring soonest" },
  { value: "expires_at:desc", label: "Expiring latest" },
  { value: "last_active_at:desc", label: "Recently active" },
  { value: "last_active_at:asc", label: "Least active" },
];
const PAGE_SIZE = 20;

export default function BusinessesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name:asc");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const [sortField, order] = sort.split(":");

  const { data, error, loading, reload } = useLoad(
    () => listBusinesses({ search: q, status, sort: sortField, order: order as "asc" | "desc", page, page_size: PAGE_SIZE }),
    [q, status, sort, page],
  );

  return (
    <>
      <PageTitle title="Businesses" hint="All shops using PakPOS. Tap a name to see details." />
      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField id="biz-search" label="Search" value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Name or phone number" />
          <SelectField id="biz-status" label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} />
          <SelectField id="biz-sort" label="Sort by" value={sort} onChange={(v) => { setSort(v); setPage(1); }} options={SORT_OPTIONS} />
        </div>

        <div className="mt-5">
          {loading && !data && <Loading />}
          {error && <ErrorBox error={error} onRetry={reload} />}
          {data && data.items.length === 0 && <Empty title="No businesses found" hint="Try a different search or status." />}
          {data && data.items.length > 0 && (
            <div className={loading ? "opacity-60" : ""}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-sm text-slate-600">
                      {["Business", "Owner phone", "Plan", "Status", "Expires on", "Days left", "Branches", "Users", "Last active"].map((h) => (
                        <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <Link href={`/businesses/${b.id}`} className="font-semibold text-brand hover:underline">{b.name}</Link>
                        </td>
                        <td className="px-3 py-3">{b.owner_phone ?? "—"}</td>
                        <td className="px-3 py-3">{b.plan_name ?? "—"}</td>
                        <td className="px-3 py-3"><StatusBadge status={b.status} /></td>
                        <td className="px-3 py-3">{formatDate(b.expires_at)}</td>
                        <td className="px-3 py-3">{daysLeftText(b.days_left)}</td>
                        <td className="px-3 py-3">{b.branches}</td>
                        <td className="px-3 py-3">{b.users}</td>
                        <td className="px-3 py-3">{formatDateTime(b.last_active_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
