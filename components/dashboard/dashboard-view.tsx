"use client";

import Link from "next/link";
import { customers, facilities } from "@/lib/data";
import { HAZARD_SHORT } from "@/lib/labels";
import { attentionLabel, attentionRank } from "@/lib/reports";
import { useStore } from "@/lib/store";
import { cn, formatNumber, isIncomplete, totalQuantity } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import type { HazardClass } from "@/lib/types";
import type { InventoryRecord } from "@/lib/store";

function complianceScore(records: InventoryRecord[]) {
  if (records.length === 0) return 0;
  const points = records.reduce((sum, record) => {
    if (record.status === "current") return sum + 1;
    if (record.status === "review") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / records.length) * 100);
}

function issueLabel(record: InventoryRecord) {
  if (attentionRank(record) < 4) return attentionLabel(record);
  if (isIncomplete(record.chemical)) return "Missing a location or ingredients";
  return attentionLabel(record);
}

function queueHref(record: InventoryRecord) {
  if (record.status === "missing" || record.status === "current") return `/inventory?id=${record.chemical.id}`;
  return `/sds?id=${record.chemical.id}`;
}

export function DashboardView() {
  const { scoped, records, state, setFacility } = useStore();
  const customer = customers.find((item) => item.id === state.customerId);
  const facility = facilities.find((item) => item.id === state.facilityId);
  const customerFacilities = facilities.filter((item) => item.customerId === state.customerId);
  const yearLabel = state.year === "all" ? "All years" : String(state.year);
  const score = complianceScore(scoped);
  const openLines = scoped.filter((record) => record.status !== "current").length;
  const inReview = scoped.filter((record) => record.status === "review").length;

  const chart = (Object.keys(HAZARD_SHORT) as HazardClass[])
    .map((hazard) => ({
      label: HAZARD_SHORT[hazard],
      count: scoped.filter((record) => record.chemical.hazardClass === hazard).length,
    }))
    .filter((item) => item.count > 0);
  const chartMax = Math.max(1, ...chart.map((item) => item.count));

  const queue = [...scoped]
    .filter((record) => attentionRank(record) < 4 || isIncomplete(record.chemical))
    .sort((a, b) => attentionRank(a) - attentionRank(b) || a.chemical.name.localeCompare(b.chemical.name));

  const metrics = [
    {
      label: "Current",
      value: `${score}%`,
      detail: openLines === 0 ? "All sheets current" : `${openLines} still open`,
    },
    { label: "Products", value: String(scoped.length), detail: yearLabel },
    { label: "In review", value: String(inReview), detail: "Inside the review window" },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {facility ? (
          <div className="grid lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <div className="relative h-44 lg:h-auto lg:min-h-full">
              <img src={facility.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 to-[#0f172a]/10" />
              <div className="absolute right-4 bottom-4 left-4 text-white">
                <p className="text-[11px] tracking-[0.08em] text-white/75 uppercase">{facility.kind}</p>
                <p className="text-lg font-semibold">{facility.city}, {facility.state}</p>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-6 p-5 sm:p-6">
              <div>
                <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  {customer?.name} · {yearLabel}
                </p>
                <h1 className="mt-2 text-[26px] leading-none font-semibold tracking-[-0.02em] sm:text-[28px]">
                  {facility.name}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">{facility.address}</p>
                <p className="mt-1 font-mono text-[12px] text-muted-foreground">{facility.epaId}</p>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">Proposed five-year review rule.</p>
              </div>
              <MetricRow metrics={metrics} />
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {yearLabel}
            </p>
            <h1 className="mt-2 text-[26px] leading-none font-semibold tracking-[-0.02em] sm:text-[28px]">
              {customer?.name ?? "Overview"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              All {customer?.shortName ?? "customer"} facilities. Proposed five-year review rule.
            </p>
            <div className="mt-6">
              <MetricRow metrics={metrics} />
            </div>
          </div>
        )}
      </section>

      {state.facilityId === "all" ? (
        <FacilityGrid
          facilities={customerFacilities}
          records={records}
          year={state.year}
          yearLabel={yearLabel}
          activeId={state.facilityId}
          onSelect={setFacility}
        />
      ) : null}

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <article className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5">
            <h2 className="text-[15px] font-semibold tracking-tight">Needs attention</h2>
            <Link href="/inventory" className="text-[12px] font-medium text-primary">
              Open inventory
            </Link>
          </div>
          {queue.length === 0 ? (
            <p className="px-5 pb-8 text-sm text-muted-foreground">
              Every line in this view has a current sheet, a location, and ingredients.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">Inventory lines that need attention</caption>
                <thead>
                  <tr className="border-y border-border text-left text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                    <th className="px-4 py-2 font-medium sm:px-5">Product</th>
                    <th className="px-3 py-2 font-medium">Facility</th>
                    <th className="px-3 py-2 font-medium">Issue</th>
                    <th className="px-3 py-2 font-medium">Review point</th>
                    <th className="px-4 py-2 font-medium sm:px-5">On hand</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((record) => {
                    const lineFacility = facilities.find((item) => item.id === record.chemical.facilityId);
                    return (
                      <tr key={record.chemical.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 sm:px-5">
                          <Link href={queueHref(record)} className="font-medium hover:underline">
                            {record.chemical.name}
                          </Link>
                          <span className="mt-0.5 block text-[12px] text-muted-foreground">
                            {record.chemical.manufacturer} · {record.chemical.year}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[13px]">{lineFacility?.shortName}</td>
                        <td className="px-3 py-3">
                          <StatusBadge
                            status={record.status}
                            revisionDate={record.pinned?.revisionDate ?? ""}
                            reviseBy={record.reviseBy}
                          />
                          <span className="mt-1 block text-[12px] text-muted-foreground">{issueLabel(record)}</span>
                        </td>
                        <td className="px-3 py-3 text-[13px] text-muted-foreground">
                          {record.pinned ? record.reviseBy : "No sheet"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[13px] tabular-nums sm:px-5">
                          {formatNumber(totalQuantity(record.chemical))} {record.chemical.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-xl border border-border bg-card shadow-card p-4">
          <h2 className="text-[15px] font-semibold tracking-tight">Hazard mix</h2>
          {chart.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No chemicals in this view.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {chart.map((item) => (
                <li key={item.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                    <span>{item.label}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(item.count / chartMax) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <article className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-semibold tracking-tight">Recent activity</h2>
        </div>
        {state.activity.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-muted-foreground">Adds, edits, and new SDS versions will show up here.</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {state.activity.slice(0, 6).map((entry) => (
              <li key={entry.id}>
                <Link href={entry.href} className="flex items-baseline justify-between gap-4 px-4 py-3 sm:px-5">
                  <span className="text-sm">{entry.summary}</span>
                  <time className="shrink-0 text-[12px] text-muted-foreground" dateTime={entry.at}>
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(entry.at))}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>

      {facility && customerFacilities.length > 1 ? (
        <FacilityGrid
          facilities={customerFacilities}
          records={records}
          year={state.year}
          yearLabel={yearLabel}
          activeId={state.facilityId}
          onSelect={setFacility}
        />
      ) : null}
    </div>
  );
}

function MetricRow({ metrics }: { metrics: { label: string; value: string; detail: string }[] }) {
  return (
    <dl className="grid grid-cols-3 gap-3 border-t border-border pt-4">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <dt className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">{metric.label}</dt>
          <dd className="mt-1 text-[28px] leading-none font-semibold tracking-[-0.03em]">{metric.value}</dd>
          <dd className="mt-1 text-[12px] text-muted-foreground">{metric.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function FacilityGrid({
  facilities: items,
  records,
  year,
  yearLabel,
  activeId,
  onSelect,
}: {
  facilities: typeof facilities;
  records: InventoryRecord[];
  year: number | "all";
  yearLabel: string;
  activeId: string;
  onSelect: (id: (typeof facilities)[number]["id"]) => void;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {items.map((item) => {
        const facilityRecords = records.filter(
          (record) => record.chemical.facilityId === item.id && (year === "all" || record.chemical.year === year),
        );
        const score = complianceScore(facilityRecords);
        const needs = facilityRecords.filter((record) => record.status !== "current").length;
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-pressed={active}
            className={cn(
              "overflow-hidden rounded-xl border border-border bg-card text-left shadow-card",
              active && "ring-2 ring-primary",
            )}
          >
            <div className="relative h-28">
              <img src={item.image} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/75 to-transparent" />
              <div className="absolute right-3 bottom-3 left-3 text-white">
                <p className="text-[11px] tracking-[0.08em] text-white/75 uppercase">{item.kind}</p>
                <p className="text-[15px] font-semibold">{item.name}</p>
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
              <p className="text-[12px] font-medium text-primary">{active ? "Showing this facility" : "Focus this facility"}</p>
            </div>
          </button>
        );
      })}
    </section>
  );
}
