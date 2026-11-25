import type { InventoryRecord } from "./store";
import { isBelowMinimum, locationLabel, totalQuantity } from "./utils";
import { STATUS_LABEL } from "./labels";

export type ReportType = "tier2" | "gap" | "quantity";

export const REPORT_TYPES: { id: ReportType; label: string; summary: string }[] = [
  {
    id: "tier2",
    label: "Tier II inventory",
    summary: "Storage amounts by location for an EPCRA-style chemical inventory excerpt.",
  },
  {
    id: "gap",
    label: "SDS compliance gap",
    summary: "Sheets inside the 12-month review window, or already older than five years.",
  },
  {
    id: "quantity",
    label: "Annual quantity summary",
    summary: "On-hand totals grouped by hazard class and unit of measure.",
  },
];

export type ReportTable = {
  title: string;
  intro: string;
  columns: string[];
  rows: string[][];
};

export function filterByYear(records: InventoryRecord[], year: string) {
  if (year === "all") return records;
  const value = Number(year);
  return records.filter((record) => record.chemical.year === value);
}

export function buildReport(type: ReportType, records: InventoryRecord[]): ReportTable {
  if (type === "tier2") {
    const rows = records.flatMap((record) =>
      record.chemical.locations.map((location) => [
        record.chemical.name,
        record.chemical.cas,
        record.chemical.hazardClass,
        record.chemical.physicalState,
        String(location.quantity),
        record.chemical.unit,
        locationLabel(location),
      ]),
    );
    return {
      title: "Tier II chemical inventory",
      intro: "Each row is one storage position. Amounts are the on-hand quantities in this prototype, not a measured maximum daily amount.",
      columns: ["Product", "CAS", "Hazard class", "State", "Amount", "Unit", "Storage location"],
      rows,
    };
  }

  if (type === "gap") {
    const rows = records
      .filter((record) => record.status !== "current")
      .map((record) => [
        record.chemical.name,
        record.chemical.cas,
        record.latest.revisionDate,
        STATUS_LABEL[record.status],
        record.reviseBy,
        record.chemical.manufacturer,
      ]);
    return {
      title: "SDS compliance gap",
      intro: "Included when the latest revision will turn five years old within 12 months, or already has.",
      columns: ["Product", "CAS", "Latest revision", "Flag", "Five-year date", "Manufacturer"],
      rows,
    };
  }

  const groups = new Map<string, { hazard: string; unit: string; skus: number; total: number }>();
  for (const record of records) {
    const key = `${record.chemical.hazardClass}|${record.chemical.unit}`;
    const current = groups.get(key) ?? {
      hazard: record.chemical.hazardClass,
      unit: record.chemical.unit,
      skus: 0,
      total: 0,
    };
    current.skus += 1;
    current.total += totalQuantity(record.chemical);
    groups.set(key, current);
  }

  const rows = [...groups.values()]
    .sort((a, b) => b.total - a.total)
    .map((group) => [group.hazard, group.unit, String(group.skus), String(group.total)]);

  return {
    title: "Annual quantity summary",
    intro: "On-hand totals stay split by unit, so liters are never added to kilograms or gallons.",
    columns: ["Hazard class", "Unit", "SKUs", "On hand"],
    rows,
  };
}

export function attentionRank(record: InventoryRecord) {
  if (record.status === "outdated") return 0;
  if (isBelowMinimum(record.chemical)) return 1;
  if (record.status === "review") return 2;
  return 3;
}

export function attentionLabel(record: InventoryRecord) {
  if (record.status === "outdated") return "Outdated sheet";
  if (isBelowMinimum(record.chemical)) return "Below minimum";
  if (record.status === "review") return "Sheet due for review";
  return "In range";
}
