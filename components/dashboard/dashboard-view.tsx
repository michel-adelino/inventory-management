"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { facilities } from "@/lib/data";
import { HAZARD_SHORT } from "@/lib/labels";
import { attentionLabel, attentionRank } from "@/lib/reports";
import { useStore } from "@/lib/store";
import { cn, formatNumber, isBelowMinimum, totalQuantity } from "@/lib/utils";
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

function locationCount(records: InventoryRecord[]) {
  return records.reduce((sum, record) => sum + record.chemical.locations.length, 0);
}

export function DashboardView() {
  const { scoped, records, state, setFacility } = useStore();
  const today = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const outdated = scoped.filter((record) => record.status === "outdated").length;
  const review = scoped.filter((record) => record.status === "review").length;
  const atRisk = scoped.filter(
    (record) => record.status === "outdated" || isBelowMinimum(record.chemical),
  ).length;
  const scopeName =
    state.facilityId === "all"
      ? "All facilities"
      : (facilities.find((facility) => facility.id === state.facilityId)?.name ?? "Facility");

  const chart = (Object.keys(HAZARD_SHORT) as HazardClass[])
    .map((hazard) => ({
      label: HAZARD_SHORT[hazard],
      count: scoped.filter((record) => record.chemical.hazardClass === hazard).length,
    }))
    .filter((item) => item.count > 0);

  const alerts = [...scoped]
    .filter((record) => record.status !== "current")
    .sort((a, b) => {
      const rank: Record<SdsStatus, number> = { outdated: 0, review: 1, current: 2 };
      return rank[a.status] - rank[b.status] || a.daysUntilExpiry - b.daysUntilExpiry;
    })
    .slice(0, 5);

  const attention = [...scoped].filter((record) => attentionRank(record) < 3).sort((a, b) => attentionRank(a) - attentionRank(b)).slice(0, 6);

  const stats = [
    {
      label: "SKUs on hand",
      value: String(scoped.length),
      detail: `Across ${locationCount(scoped)} storage positions`,
    },
    {
      label: "Quantity at risk",
      value: String(atRisk),
      detail: "SKUs below minimum or on an outdated sheet",
    },
    {
      label: "SDS needing action",
      value: String(outdated + review),
      detail: `${outdated} outdated · ${review} inside the review year`,
    },
    {
      label: "Open report items",
      value: String(outdated),
      detail: "Outdated sheets that would block the annual filing",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={today}
        title="Overview"
        description={`${scopeName}. Sheets older than five years are flagged from the revision date, not from a stored status.`}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-xl border border-border bg-card px-4 py-4">
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{stat.label}</p>
            <p className="mt-3 font-mono text-[32px] leading-none tracking-tight">{stat.value}</p>
            <p className="mt-3 text-[13px] leading-5 text-muted-foreground">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <article className="rounded-xl border border-border bg-card p-4 lg:col-span-3">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-medium tracking-tight">Inventory by hazard class</h2>
            <p className="text-[12px] text-muted-foreground">Primary class</p>
          </div>
          <HazardChart data={chart} />
        </article>
        <article className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-medium tracking-tight">Sheet alerts</h2>
            <Link href="/sds?status=outdated" className="text-[12px] text-primary">
              View library
            </Link>
          </div>
          {alerts.length === 0 ? (
            <p className="py-10 text-sm text-muted-foreground">Every sheet in this view is inside the five-year window.</p>
          ) : (
            <ul className="divide-y divide-border">
              {alerts.map((record) => {
                const facility = facilities.find((item) => item.id === record.chemical.facilityId);
                return (
                  <li key={record.chemical.id}>
                    <Link href={`/sds?id=${record.document.id}`} className="flex items-start justify-between gap-3 py-3">
                      <span>
                        <span className="block text-sm">{record.chemical.name}</span>
                        <span className="mt-0.5 block text-[12px] text-muted-foreground">
                          {facility?.shortName} · {record.latest.revisionDate}
                        </span>
                      </span>
                      <StatusBadge
                        status={record.status}
                        revisionDate={record.latest.revisionDate}
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

      <section className="grid gap-4 md:grid-cols-3">
        {facilities.map((facility) => {
          const facilityRecords = records.filter((record) => record.chemical.facilityId === facility.id);
          const score = complianceScore(facilityRecords);
          const needs = facilityRecords.filter((record) => record.status !== "current").length;
          const active = state.facilityId === facility.id;
          return (
            <button
              key={facility.id}
              type="button"
              onClick={() => setFacility(facility.id)}
              aria-pressed={active}
              className={cn(
                "overflow-hidden rounded-xl border border-border bg-card text-left",
                active && "ring-2 ring-primary",
              )}
            >
              <div className="relative h-36">
                <img src={facility.image} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1915]/75 to-transparent" />
                <div className="absolute right-3 bottom-3 left-3 text-white">
                  <p className="text-[11px] tracking-[0.12em] text-white/75 uppercase">{facility.kind}</p>
                  <p className="text-[15px] font-medium">{facility.name}</p>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <p className="text-[13px] text-muted-foreground">
                  {facility.city}, {facility.state} · {facilityRecords.length} SKUs
                </p>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span>{score}% current</span>
                    <span className="text-muted-foreground">{needs === 0 ? "All sheets current" : `${needs} need attention`}</span>
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

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <h2 className="text-[15px] font-medium tracking-tight">Needs a look</h2>
          <Link href="/inventory" className="text-[12px] text-primary">
            Open inventory
          </Link>
        </div>
        {attention.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-muted-foreground">Nothing in this scope is below minimum or waiting on a sheet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Chemicals that need attention</caption>
              <thead>
                <tr className="border-y border-border text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Facility</th>
                  <th className="px-3 py-2 font-medium">On hand</th>
                  <th className="px-4 py-2 font-medium">Issue</th>
                </tr>
              </thead>
              <tbody>
                {attention.map((record) => {
                  const facility = facilities.find((item) => item.id === record.chemical.facilityId);
                  return (
                    <tr key={record.chemical.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/inventory?id=${record.chemical.id}`} className="hover:underline">
                          {record.chemical.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{facility?.shortName}</td>
                      <td className="px-3 py-3 font-mono text-[13px] tabular-nums">
                        {formatNumber(totalQuantity(record.chemical))} {record.chemical.unit}
                      </td>
                      <td className="px-4 py-3 text-[13px]">{attentionLabel(record)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
