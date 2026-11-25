import type { InventoryRecord } from "./store";
import { STATUS_LABEL } from "./labels";
import { isBelowMinimum, locationLabel, locationQuantity, totalQuantity } from "./utils";

export type ReportType = "hazmat" | "epa" | "osha" | "sds";

export const REPORT_TYPES: { id: ReportType; label: string; summary: string }[] = [
  {
    id: "hazmat",
    label: "Hazardous Materials Inventory",
    summary: "Sample excerpt of products, container counts, and storage locations.",
  },
  {
    id: "epa",
    label: "EPA reporting",
    summary: "Sample excerpt of on-hand amounts. Reporting thresholds are not calculated.",
  },
  {
    id: "osha",
    label: "OSHA reporting",
    summary: "Sample excerpt for hazard communication: signal word, SDS status, and location.",
  },
  {
    id: "sds",
    label: "SDS review summary",
    summary: "Sample excerpt of sheets in the proposed review window, past that point, or missing.",
  },
];

export type ReportTable = {
  title: string;
  intro: string;
  columns: string[];
  rows: string[][];
};

const SAMPLE =
  "Sample excerpt for this demo. It is not an official EPA or OSHA submission, and the five-year mark is a proposed review rule.";

export function buildReport(type: ReportType, records: InventoryRecord[]): ReportTable {
  if (type === "hazmat") {
    const rows = records.flatMap((record) =>
      record.chemical.locations.map((location) => [
        record.chemical.name,
        record.chemical.cas,
        String(location.containerSize),
        String(location.containerCount),
        String(locationQuantity(location)),
        record.chemical.unit,
        locationLabel(location),
      ]),
    );
    return {
      title: "Hazardous Materials Inventory",
      intro: `${SAMPLE} Each row is one storage position. On hand is container size times container count.`,
      columns: ["Product", "CAS", "Container size", "Count", "On hand", "Unit", "Storage location"],
      rows,
    };
  }

  if (type === "epa") {
    const rows = records.map((record) => [
      record.chemical.name,
      record.chemical.cas,
      record.chemical.hazardClass,
      record.chemical.physicalState,
      String(totalQuantity(record.chemical)),
      record.chemical.unit,
      String(record.chemical.year),
    ]);
    return {
      title: "EPA reporting",
      intro: `${SAMPLE} Amounts are the on-hand totals in this workspace, not a measured maximum daily amount.`,
      columns: ["Product", "CAS", "Hazard class", "State", "On hand", "Unit", "Inventory year"],
      rows,
    };
  }

  if (type === "osha") {
    const rows = records.map((record) => [
      record.chemical.name,
      record.chemical.signalWord,
      record.chemical.hazardClass,
      STATUS_LABEL[record.status],
      record.pinned?.revisionDate ?? "—",
      record.chemical.locations[0] ? locationLabel(record.chemical.locations[0]) : "—",
    ]);
    return {
      title: "OSHA reporting",
      intro: `${SAMPLE} One row per inventory line, using the SDS version pinned to that year.`,
      columns: ["Product", "Signal word", "Hazard class", "SDS status", "Pinned revision", "Primary location"],
      rows,
    };
  }

  const rows = records
    .filter((record) => record.status !== "current")
    .map((record) => [
      record.chemical.name,
      record.chemical.cas,
      record.pinned?.label ?? "—",
      record.pinned?.revisionDate ?? "—",
      STATUS_LABEL[record.status],
      record.reviseBy || "—",
      record.chemical.manufacturer,
    ]);
  return {
    title: "SDS review summary",
    intro: `${SAMPLE} Included when the pinned revision is in the review window, past the five-year point, or the sheet is missing.`,
    columns: ["Product", "CAS", "Pinned version", "Revision date", "Flag", "Review point", "Manufacturer"],
    rows,
  };
}

export function attentionRank(record: InventoryRecord) {
  if (record.status === "missing") return 0;
  if (record.status === "outdated") return 1;
  if (isBelowMinimum(record.chemical)) return 2;
  if (record.status === "review") return 3;
  return 4;
}

export function attentionLabel(record: InventoryRecord) {
  if (record.status === "missing") return "Missing sheet";
  if (record.status === "outdated") return "Past review point";
  if (isBelowMinimum(record.chemical)) return "Below minimum";
  if (record.status === "review") return "Sheet due for review";
  return "In range";
}
