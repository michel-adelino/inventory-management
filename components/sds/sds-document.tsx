"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { GhsIcon } from "@/components/ghs-icon";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { facilities } from "@/lib/data";
import { PICTOGRAM_LABEL } from "@/lib/labels";
import { STATUS_LABEL } from "@/lib/labels";
import { SDS_SECTIONS, sectionNote, sdsTiming, statusDetail } from "@/lib/sds";
import type { InventoryRecord } from "@/lib/store";
import { useStore } from "@/lib/store";
import { createId, formatDate, slugify, todayIso } from "@/lib/utils";

export function SdsDocument({ record }: { record: InventoryRecord }) {
  const { addVersion } = useStore();
  const [open, setOpen] = useState(false);
  const chemical = record.chemical;
  const facility = facilities.find((item) => item.id === chemical.facilityId);
  const versions = [...(record.document?.versions ?? [])].sort((a, b) => b.revisionDate.localeCompare(a.revisionDate));
  const detail = statusDetail(record.status, record.reviseBy, record.pinned?.revisionDate ?? "");
  const pinnedLabel = record.pinned ? `${record.pinned.label}, revised ${formatDate(record.pinned.revisionDate)}` : "no sheet on file";

  return (
    <article className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">Safety data sheet</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[24px] leading-tight font-medium tracking-[-0.03em]">{chemical.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {chemical.manufacturer} · {facility?.name}
            </p>
          </div>
          <StatusBadge status={record.status} revisionDate={record.pinned?.revisionDate ?? ""} reviseBy={record.reviseBy} />
        </div>
        {record.status === "current" ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {detail} This {chemical.year} line uses {pinnedLabel}.
          </p>
        ) : (
          <div
            className={
              record.status === "outdated"
                ? "mt-4 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-destructive"
                : record.status === "missing"
                  ? "mt-4 flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm"
                  : "mt-4 flex items-start gap-2 rounded-lg bg-review-soft px-3 py-2.5 text-sm text-review"
            }
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              {detail} This {chemical.year} line uses {pinnedLabel}.
            </p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            {record.document ? "Add revision" : "Add SDS"}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/inventory?id=${chemical.id}`}>View in inventory</Link>
          </Button>
        </div>
      </div>

      <ol className="divide-y divide-border">
        {SDS_SECTIONS.map((title, index) => {
          const section = index + 1;
          return (
            <li key={title} className="px-5 py-4 sm:px-6">
              <div className="flex gap-3">
                <span className="w-6 shrink-0 font-mono text-[12px] text-muted-foreground">{section}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium">{title}</h3>
                  {section === 1 ? (
                    <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Product</dt>
                        <dd>{chemical.name}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">CAS</dt>
                        <dd className="font-mono">{chemical.cas}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Manufacturer</dt>
                        <dd>{chemical.manufacturer}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Facility</dt>
                        <dd>{facility?.name}</dd>
                      </div>
                    </dl>
                  ) : null}
                  {section === 2 ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm">
                        Signal word: <span className="font-medium">{chemical.signalWord}</span>. {chemical.hazardClass}.
                      </p>
                      <ul className="flex flex-wrap gap-3">
                        {chemical.pictograms.map((pictogram) => (
                          <li key={pictogram} className="flex items-center gap-2 text-[13px]">
                            <GhsIcon name={pictogram} className="size-8" />
                            {PICTOGRAM_LABEL[pictogram]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {section === 3 ? (
                    <table className="mt-2 w-full text-sm">
                      <caption className="sr-only">Ingredients</caption>
                      <thead>
                        <tr className="text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                          <th className="py-1 font-medium">Ingredient</th>
                          <th className="py-1 font-medium">CAS</th>
                          <th className="py-1 text-right font-medium">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chemical.ingredients.map((ingredient) => (
                          <tr key={`${ingredient.name}-${ingredient.cas}`} className="border-t border-border">
                            <td className="py-1.5">{ingredient.name}</td>
                            <td className="py-1.5 font-mono text-[12px]">{ingredient.cas}</td>
                            <td className="py-1.5 text-right font-mono">{ingredient.percent}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  {section > 3 ? (
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                      {sectionNote(section, chemical.hazardClass, chemical.physicalState)}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-border px-5 py-5 sm:px-6">
        <h3 className="text-sm font-medium">Version history</h3>
        {versions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No revisions are on file for this product.</p>
        ) : null}
        <ol className="mt-4 space-y-4 border-l border-border pl-4">
          {versions.map((version) => {
            const timing = sdsTiming(version.revisionDate);
            const pinned = version.id === record.pinned?.id;
            return (
              <li key={version.id} className="relative">
                <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{version.label}</p>
                  {pinned ? (
                    <span className="text-[11px] tracking-wide text-primary uppercase">Pinned to {chemical.year}</span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">{timing.status}</span>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                  {formatDate(version.revisionDate)} · {version.fileName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{version.note}</p>
              </li>
            );
          })}
        </ol>
      </div>

      <AddRevisionDialog
        open={open}
        onOpenChange={setOpen}
        productName={chemical.name}
        suggestedLabel={`Rev ${versions.length + 1}`}
        year={chemical.year}
        onSave={(label, revisionDate, note) => {
          const version = {
            id: createId("v"),
            label,
            revisionDate,
            note: note || "Revision added in the sample workspace.",
            fileName: `SDS_${slugify(chemical.name)}_${slugify(label) || "rev"}.pdf`,
          };
          addVersion({
            sdsId: record.document?.id ?? createId("s"),
            chemicalId: chemical.id,
            year: chemical.year,
            version,
            summary: `Saved ${label} for ${chemical.name} on the ${chemical.year} inventory. Earlier years keep their pinned sheet.`,
          });
          const timing = sdsTiming(revisionDate);
          toast.success(`${label} saved for ${chemical.year}. Sheet is now ${STATUS_LABEL[timing.status]}.`);
        }}
      />
    </article>
  );
}

function AddRevisionDialog({
  open,
  onOpenChange,
  productName,
  suggestedLabel,
  year,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  suggestedLabel: string;
  year: number;
  onSave: (label: string, revisionDate: string, note: string) => void;
}) {
  const [label, setLabel] = useState(suggestedLabel);
  const [revisionDate, setRevisionDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (label.trim().length < 2) {
      setError("Enter a version label, such as Rev 7.");
      return;
    }
    if (!revisionDate || revisionDate > todayIso()) {
      setError("Choose a revision date that is not in the future.");
      return;
    }
    onSave(label.trim(), revisionDate, note.trim());
    setLabel(suggestedLabel);
    setNote("");
    setRevisionDate(todayIso());
    setError("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add revision</DialogTitle>
          <DialogDescription>
            {productName}. This version is pinned to the {year} inventory line. Older years keep the sheet they already had. The five-year mark is a proposed review rule.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <DialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="revision-label">Version</Label>
              <Input id="revision-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Rev 7" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revision-date">Revision date</Label>
              <Input
                id="revision-date"
                type="date"
                max={todayIso()}
                value={revisionDate}
                onChange={(event) => setRevisionDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revision-note">Note</Label>
              <Input id="revision-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed" />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save revision</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
