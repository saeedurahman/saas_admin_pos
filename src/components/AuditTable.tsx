"use client";
import { formatDateTime } from "@/lib/format";
import type { AuditRow } from "@/lib/types";

function Json({ value }: { value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) return <span className="text-slate-400">—</span>;
  return (
    <pre className="max-w-xs overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-xs text-slate-800">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AuditTable({ rows, compact = false }: { rows: AuditRow[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left">
        <thead>
          <tr className="border-b border-slate-200 text-sm text-slate-600">
            <th className="px-3 py-2 font-semibold">When</th>
            <th className="px-3 py-2 font-semibold">Who</th>
            <th className="px-3 py-2 font-semibold">What happened</th>
            {!compact && <th className="px-3 py-2 font-semibold">Before</th>}
            {!compact && <th className="px-3 py-2 font-semibold">After</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 align-top">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-3 py-3">{formatDateTime(r.created_at)}</td>
              <td className="px-3 py-3">{r.admin_email}</td>
              <td className="px-3 py-3">
                <span className="font-semibold">{r.action.replace(/[._]/g, " ")}</span>
                {r.entity_label && <span className="text-slate-600"> · {r.entity_label}</span>}
              </td>
              {!compact && <td className="px-3 py-3"><Json value={r.before} /></td>}
              {!compact && <td className="px-3 py-3"><Json value={r.after} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
