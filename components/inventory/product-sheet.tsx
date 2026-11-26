"use client";

import Link from "next/link";
import { GhsIcon } from "@/components/ghs-icon";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { facilities } from "@/lib/data";
import { PACKAGING_IMAGE, PACKAGING_LABEL, PICTOGRAM_LABEL } from "@/lib/labels";
import type { InventoryRecord } from "@/lib/store";
import { formatDate, formatNumber, isBelowMinimum, locationLabel, locationQuantity, totalQuantity } from "@/lib/utils";

const ingredientColors = ["#2563eb", "#0f172a", "#64748b", "#047857", "#b45309"];

export function ProductSheet({
  record,
  open,
  onOpenChange,
  onEdit,
}: {
  record: InventoryRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}) {
  const chemical = record?.chemical;
  const facility = chemical ? facilities.find((item) => item.id === chemical.facilityId) : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {record && chemical ? (
          <>
            <SheetHeader>
              <SheetTitle>{chemical.name}</SheetTitle>
              <SheetDescription>
                {chemical.manufacturer} · {facility?.shortName}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-6">
              <div className="flex gap-4">
                <img
                  src={PACKAGING_IMAGE[chemical.packaging]}
                  alt={`${PACKAGING_LABEL[chemical.packaging]} used for ${chemical.name}`}
                  className="size-28 rounded-lg border border-border object-cover"
                />
                <div className="min-w-0 space-y-2">
                  <p
                    className={
                      chemical.signalWord === "Danger"
                        ? "inline-flex rounded border border-destructive px-2 py-0.5 text-[12px] font-semibold tracking-[0.08em] text-destructive uppercase"
                        : "inline-flex rounded border border-review px-2 py-0.5 text-[12px] font-semibold tracking-[0.08em] text-review uppercase"
                    }
                  >
                    {chemical.signalWord}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {chemical.hazardClass} · {chemical.physicalState}
                  </p>
                  <StatusBadge
                    status={record.status}
                    revisionDate={record.pinned?.revisionDate ?? ""}
                    reviseBy={record.reviseBy}
                  />
                  {onEdit ? (
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onEdit();
                        }}
                      >
                        Edit line
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              <ul className="flex flex-wrap gap-3">
                {chemical.pictograms.map((pictogram) => (
                  <li key={pictogram} className="flex items-center gap-2 text-[13px]">
                    <GhsIcon name={pictogram} className="size-9" />
                    {PICTOGRAM_LABEL[pictogram]}
                  </li>
                ))}
              </ul>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">CAS</dt>
                  <dd className="mt-1 font-mono">{chemical.cas}</dd>
                </div>
                <div>
                  <dt className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Inventory year</dt>
                  <dd className="mt-1 font-mono">{chemical.year}</dd>
                </div>
                <div>
                  <dt className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">On hand</dt>
                  <dd className="mt-1 font-mono">
                    {formatNumber(totalQuantity(chemical))} {chemical.unit}
                    {isBelowMinimum(chemical) ? (
                      <span className="ml-2 text-[12px] text-destructive">Below minimum</span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Updated</dt>
                  <dd className="mt-1">{formatDate(chemical.updatedAt)}</dd>
                </div>
              </dl>

              <section>
                <h3 className="text-[13px] font-medium">Storage</h3>
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {chemical.locations.map((location) => (
                    <li key={locationLabel(location)} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span>{locationLabel(location)}</span>
                      <span className="text-right font-mono text-[13px] tabular-nums">
                        {formatNumber(location.containerSize)} {chemical.unit} × {location.containerCount}
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {formatNumber(locationQuantity(location))} {chemical.unit}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-[13px] font-medium">Ingredients</h3>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-secondary">
                  {chemical.ingredients.map((ingredient, index) => (
                    <div
                      key={`${ingredient.cas}-${ingredient.name}`}
                      style={{
                        width: `${ingredient.percent}%`,
                        background: ingredientColors[index % ingredientColors.length],
                      }}
                    />
                  ))}
                </div>
                <ul className="mt-3 space-y-2">
                  {chemical.ingredients.map((ingredient, index) => (
                    <li key={`${ingredient.cas}-${ingredient.name}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: ingredientColors[index % ingredientColors.length] }}
                        />
                        <span className="truncate">{ingredient.name}</span>
                        <span className="font-mono text-[12px] text-muted-foreground">{ingredient.cas}</span>
                      </span>
                      <span className="font-mono text-[13px] tabular-nums">{ingredient.percent}%</span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="rounded-lg border border-border px-3 py-3">
                {record.pinned ? (
                  <p className="text-[13px]">
                    {chemical.year} inventory uses {record.pinned.label}, revised {formatDate(record.pinned.revisionDate)}.
                  </p>
                ) : (
                  <p className="text-[13px]">No safety data sheet is on file for this {chemical.year} line.</p>
                )}
                <Link href={`/sds?id=${chemical.id}`} className="mt-2 inline-flex text-sm text-primary">
                  {record.pinned ? "Open safety data sheet" : "Add a safety data sheet"}
                </Link>
              </div>
            </SheetBody>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>Product</SheetTitle>
            <SheetDescription>Select a chemical from the inventory.</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}
