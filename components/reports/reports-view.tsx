"use client";

import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { PdfPreviewDialog } from "@/components/reports/pdf-preview-dialog";
import type { ReportPdfModel } from "@/components/reports/report-pdf";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { customers, facilities } from "@/lib/data";
import { YEARS } from "@/lib/labels";
import { REPORT_TYPES, buildReport, type ReportType } from "@/lib/reports";
import { useStore, type YearScope } from "@/lib/store";
import type { FacilityId } from "@/lib/types";
import { slugify } from "@/lib/utils";

export function ReportsView() {
  const { scoped, state, setFacility, setYear } = useStore();
  const [type, setType] = useState<ReportType>("hazmat");
  const [generatedType, setGeneratedType] = useState<ReportType>("hazmat");
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const [pdfOpen, setPdfOpen] = useState(false);

  const customer = customers.find((item) => item.id === state.customerId);
  const customerFacilities = facilities.filter((item) => item.customerId === state.customerId);
  const facility =
    facilities.find((item) => item.id === state.facilityId) ?? customerFacilities[0] ?? facilities[0];
  const dirty = type !== generatedType;
  const yearLabel = state.year === "all" ? "All years" : String(state.year);

  const table = useMemo(() => buildReport(generatedType, scoped), [generatedType, scoped]);

  const scopeName = state.facilityId === "all" ? customer?.shortName ?? "customer" : facility.shortName;

  function generate() {
    setGeneratedType(type);
    setGeneratedAt(new Date());
    toast.success("Report preview updated.");
  }

  function download() {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [table.columns, ...table.rows].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const name = `${slugify(scopeName)}-${generatedType}-${state.year}.csv`;
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${name}`);
  }

  const meta = REPORT_TYPES.find((item) => item.id === generatedType);
  const heading = state.facilityId === "all" ? `${customer?.name ?? "Customer"} · all facilities` : facility.name;
  const generatedLabel = generatedAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const pdfModel = useMemo<ReportPdfModel>(
    () => ({
      title: table.title,
      intro: table.intro,
      columns: table.columns,
      rows: table.rows,
      customerName: customer?.name ?? "Customer",
      facilityName: heading,
      address: state.facilityId === "all" ? "" : facility.address,
      epaId: state.facilityId === "all" ? "" : facility.epaId,
      yearLabel,
      generatedLabel,
    }),
    [table, customer?.name, heading, state.facilityId, facility.address, facility.epaId, yearLabel, generatedLabel],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Regulatory reporting"
        description="Sample excerpts from the same inventory lines. Export a PDF or CSV of the preview. Nothing here is an official EPA or OSHA filing."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <form
          className="no-print space-y-4 rounded-xl border border-border bg-card shadow-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            generate();
          }}
        >
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" htmlFor="report-facility">
              Facility
            </label>
            <Select value={state.facilityId} onValueChange={(value) => setFacility(value as FacilityId | "all")}>
              <SelectTrigger id="report-facility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facilities</SelectItem>
                {customerFacilities.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" htmlFor="report-year">
              Year
            </label>
            <Select
              value={String(state.year)}
              onValueChange={(value) => setYear(value === "all" ? "all" : (Number(value) as YearScope))}
            >
              <SelectTrigger id="report-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {YEARS.map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium">Report</legend>
            {REPORT_TYPES.map((item) => (
              <label key={item.id} className="flex cursor-pointer gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <input
                  type="radio"
                  name="report-type"
                  value={item.id}
                  checked={type === item.id}
                  onChange={() => setType(item.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block">{item.label}</span>
                  <span className="mt-0.5 block text-[12px] leading-5 text-muted-foreground">{item.summary}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {dirty ? <p className="text-[12px] text-review">Report type changed. Generate to refresh the preview.</p> : null}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Generate preview
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline">
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setPdfOpen(true)}>
                  <FileText className="size-4" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={download}>
                  <Download className="size-4" />
                  CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </form>

        <article className="report-sheet overflow-hidden rounded-xl border border-border bg-white shadow-card">
          <div className="relative h-28">
            <img src={facility.image} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[#0f172a]/55" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-5 py-3 text-white sm:px-6">
              <div>
                <p className="text-[11px] tracking-[0.08em] text-white/75 uppercase">Sample excerpt</p>
                <p className="text-lg font-semibold">{heading}</p>
              </div>
              <p className="font-mono text-[11px] sm:text-xs">{facility.epaId}</p>
            </div>
          </div>
          <div className="px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{table.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {customer?.name}
                  {state.facilityId === "all" ? "" : ` · ${facility.address}`}
                </p>
              </div>
              <dl className="text-sm sm:text-right">
                <div>
                  <dt className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Reporting year</dt>
                  <dd className="font-mono">{yearLabel}</dd>
                </div>
                <div className="mt-2">
                  <dt className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Generated</dt>
                  <dd className="font-mono text-[12px]">
                    {generatedLabel}
                  </dd>
                </div>
              </dl>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6">{meta?.summary} {table.intro}</p>
            {table.rows.length === 0 ? (
              <p className="mt-8 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No rows for this facility and year.
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <caption className="sr-only">{table.title}</caption>
                  <thead>
                    <tr className="border-b border-foreground text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                      {table.columns.map((column) => (
                        <th key={column} className="py-2 pr-3 font-medium">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, index) => (
                      <tr key={`${row[0]}-${index}`} className="border-b border-border">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={`${columnKey(table.columns[cellIndex])}-${cellIndex}`}
                            className={
                              cellIndex === 0
                                ? "py-2 pr-4 align-top whitespace-nowrap"
                                : "py-2 pr-4 align-top font-mono text-[12px] whitespace-nowrap"
                            }
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-6 border-t border-border pt-3 text-[12px] leading-5 text-muted-foreground">
              Sample excerpt for demonstration. Not a regulatory submission. {table.rows.length} row{table.rows.length === 1 ? "" : "s"}.
            </p>
          </div>
        </article>
      </div>
      <PdfPreviewDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        model={pdfModel}
        fileName={`${slugify(scopeName)}-${generatedType}-${state.year}.pdf`}
      />
    </div>
  );
}

function columnKey(value: string | undefined) {
  return value ?? "cell";
}
