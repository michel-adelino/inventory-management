"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { customers, facilities } from "@/lib/data";
import { HAZARD_SHORT } from "@/lib/labels";
import { attentionLabel, attentionRank } from "@/lib/reports";
import { useStore } from "@/lib/store";
import { cn, formatDate, formatNumber, isIncomplete, totalQuantity } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import type { HazardClass, SdsStatus } from "@/lib/types";
import type { InventoryRecord } from "@/lib/store";

const HazardChart = dynamic(
  () => import("@/components/dashboard/hazard-chart").then((mod) => mod.HazardChart),
  { ssr: false, loading: () => <div className="h-60 rounded-md bg-secondary" /> },
);

function complianceScore(records: InventoryRecord[]) {
  if (records.length === 0) return 0;
  const points = records.reduce((sum, record) => {
    if (record.status === "current") return sum + 1;
    if (record.status === "review") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / records.length) * 100);
}

const ALERT_RANK: Record<SdsStatus, number> = { missing: 0, outdated: 1, review: 2, current: 3 };

export function DashboardView() {
  const { scoped, records, state, setFacility } = useStore();
  const today = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const customer = customers.find((item) => item.id === state.customerId);
  const facility = facilities.find((item) => item.id === state.facilityId);
  const customerFacilities = facilities.filter((item) => item.customerId === state.customerId);
  const visibleFacilities =
    state.facilityId === "all" ? customerFacilities : customerFacilities.filter((item) => item.id === state.facilityId);
  const yearLabel = state.year === "all" ? "All years" : String(state.year);
  const scopeName = facility?.name ?? `All ${customer?.shortName ?? "customer"} facilities`;

  const openLines = scoped.filter((record) => record.status !== "current").length;
  const inReview = scoped.filter((record) => record.status === "review").length;
  const incomplete = scoped.filter((record) => isIncomplete(record.chemical)).length;
  const missing = scoped.filter((record) => record.status === "missing").length;

  const chart = (Object.keys(HAZARD_SHORT) as HazardClass[])
    .map((hazard) => ({
      label: HAZARD_SHORT[hazard],
      count: scoped.filter((record) => record.chemical.hazardClass === hazard).length,
    }))
    .filter((item) => item.count > 0);

  const alerts = [...scoped]
    .filter((record) => record.status !== "current")
    .sort((a, b) => {
      const daysA = a.daysUntilExpiry ?? -9999;
      const daysB = b.daysUntilExpiry ?? -9999;
      return ALERT_RANK[a.status] - ALERT_RANK[b.status] || daysA - daysB;
    })
    .slice(0, 6);

  const attention = [...scoped]
    .filter((record) => attentionRank(record) < 4)
    .sort((a, b) => attentionRank(a) - attentionRank(b))
    .slice(0, 6);

  const stats = [
    { label: "Facilities", value: String(visibleFacilities.length), detail: customer?.name ?? "Customer" },
    { label: "Products", value: String(scoped.length), detail: `${scopeName} · ${yearLabel}` },
    { label: "Lines still open", value: String(openLines), detail: "Missing a current sheet for this year" },
    { label: "SDS in review", value: String(inReview), detail: "Inside the proposed review window" },
    { label: "Incomplete lines", value: String(incomplete), detail: "Missing a sheet, location, or ingredients" },
    { label: "Missing sheets", value: String(missing), detail: "No SDS is on file" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={today}
        title={customer?.name ?? "Overview"}
        description={`${scopeName} · ${yearLabel}. The five-year mark is a proposed review rule for this workspace, not a regulatory expiration.`}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-xl border border-border bg-card shadow-card px-4 py-4">
            <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">{stat.label}</p>
            <p className="mt-3 text-[32px] leading-none font-semibold tracking-[-0.03em]">{stat.value}</p>
            <p className="mt-3 text-[13px] leading-5 text-muted-foreground">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <article className="rounded-xl border border-border bg-card shadow-card p-4 lg:col-span-3">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-tight">Inventory by hazard class</h2>
            <p className="text-[12px] text-muted-foreground">Primary class</p>
          </div>
          <HazardChart data={chart} />
        </article>
        <article className="rounded-xl border border-border bg-card shadow-card p-4 lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-tight">Upcoming reviews</h2>
            <Link href="/sds?status=review" className="text-[12px] text-primary">
              View library
            </Link>
          </div>
          {alerts.length === 0 ? (
            <p className="py-10 text-sm text-muted-foreground">Every sheet in this view is inside the proposed window.</p>
          ) : (
            <ul className="divide-y divide-border">
              {alerts.map((record) => {
                const lineFacility = facilities.find((item) => item.id === record.chemical.facilityId);
                const href = record.status === "missing" ? `/inventory?id=${record.chemical.id}` : `/sds?id=${record.chemical.id}`;
                return (
                  <li key={record.chemical.id}>
                    <Link href={href} className="flex items-start justify-between gap-3 py-3">
                      <span>
                        <span className="block text-sm">{record.chemical.name}</span>
                        <span className="mt-0.5 block text-[12px] text-muted-foreground">
                          {lineFacility?.shortName} · {record.chemical.year}
                          {record.pinned ? ` · ${formatDate(record.pinned.revisionDate)}` : " · No sheet"}
                        </span>
                      </span>
                      <StatusBadge
                        status={record.status}
                        revisionDate={record.pinned?.revisionDate ?? ""}
                        reviseBy={record.reviseBy}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {customerFacilities.map((item) => {
          const facilityRecords = records.filter(
            (record) =>
              record.chemical.facilityId === item.id && (state.year === "all" || record.chemical.year === state.year),
          );
          const score = complianceScore(facilityRecords);
          const needs = facilityRecords.filter((record) => record.status !== "current").length;
          const active = state.facilityId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFacility(item.id)}
              aria-pressed={active}
              className={cn(
                "overflow-hidden rounded-xl border border-border bg-card shadow-card text-left",
                active && "ring-2 ring-primary",
              )}
            >
              <div className="relative h-36">
                <img src={item.image} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/75 to-transparent" />
                <div className="absolute right-3 bottom-3 left-3 text-white">
                  <p className="text-[11px] tracking-[0.08em] text-white/75 uppercase">{item.kind}</p>
                  <p className="text-[15px] font-medium">{item.name}</p>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <p className="text-[13px] text-muted-foreground">
                  {item.city}, {item.state} · {facilityRecords.length} lines in {yearLabel.toLowerCase()}
                </p>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span>{score}% current</span>
                    <span className="text-muted-foreground">{needs === 0 ? "All sheets current" : `${needs} still open`}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn("h-full rounded-full", score < 60 ? "bg-destructive" : score < 80 ? "bg-review" : "bg-primary")}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
                <p className="text-[12px] text-primary">{active ? "Showing this facility" : "Focus this facility"}</p>
              </div>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-baseline justify-between gap-3 px-4 py-3">
            <h2 className="text-[15px] font-semibold tracking-tight">Incomplete lines</h2>
            <Link href="/inventory" className="text-[12px] text-primary">
              Open inventory
            </Link>
          </div>
          {attention.length === 0 ? (
            <p className="px-4 pb-6 text-sm text-muted-foreground">Nothing in this scope is waiting on a sheet or a count.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Inventory lines that need attention</caption>
                <thead>
                  <tr className="border-y border-border text-left text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">On hand</th>
                    <th className="px-4 py-2 font-medium">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.map((record) => (
                    <tr key={record.chemical.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/inventory?id=${record.chemical.id}`} className="hover:underline">
                          {record.chemical.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 font-mono text-[13px] tabular-nums">
                        {formatNumber(totalQuantity(record.chemical))} {record.chemical.unit}
                      </td>
                      <td className="px-4 py-3 text-[13px]">{attentionLabel(record)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-xl border border-border bg-card shadow-card">
          <div className="px-4 py-3">
            <h2 className="text-[15px] font-semibold tracking-tight">Recent activity</h2>
          </div>
          {state.activity.length === 0 ? (
            <p className="px-4 pb-6 text-sm text-muted-foreground">Adds, edits, and new SDS versions will show up here.</p>
          ) : (
            <ul className="divide-y divide-border">
              {state.activity.slice(0, 6).map((entry) => (
                <li key={entry.id}>
                  <Link href={entry.href} className="block px-4 py-3">
                    <span className="block text-sm">{entry.summary}</span>
                    <span className="mt-1 block text-[12px] text-muted-foreground">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(entry.at))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
