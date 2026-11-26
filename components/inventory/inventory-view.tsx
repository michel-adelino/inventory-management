"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react";
import { AddChemicalDialog } from "@/components/inventory/add-chemical-dialog";
import { ProductSheet } from "@/components/inventory/product-sheet";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { facilities } from "@/lib/data";
import { HAZARD_CLASSES, PACKAGING_IMAGE, YEARS } from "@/lib/labels";
import { useStore, type YearScope } from "@/lib/store";
import type { FacilityId, HazardClass } from "@/lib/types";
import { cn, formatDate, formatNumber, locationLabel, totalQuantity } from "@/lib/utils";

type SortKey = "name" | "quantity" | "year";

export function InventoryView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scoped, records, state, setFacility, setYear } = useStore();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const query = searchParams.get("q") ?? "";
  const hazard = searchParams.get("hazard") ?? "all";
  const selectedId = searchParams.get("id");
  const customerFacilities = facilities.filter((facility) => facility.customerId === state.customerId);

  function patch(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `/inventory?${qs}` : "/inventory", { scroll: false });
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scoped
      .filter((record) => {
        if (hazard !== "all" && record.chemical.hazardClass !== hazard) return false;
        if (!needle) return true;
        const haystack = `${record.chemical.name} ${record.chemical.cas} ${record.chemical.manufacturer}`.toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => {
        const direction = sort.dir === "asc" ? 1 : -1;
        if (sort.key === "name") return a.chemical.name.localeCompare(b.chemical.name) * direction;
        if (sort.key === "year") return (a.chemical.year - b.chemical.year) * direction;
        return (totalQuantity(a.chemical) - totalQuantity(b.chemical)) * direction;
      });
  }, [scoped, query, hazard, sort]);

  const selected = records.find((record) => record.chemical.id === selectedId) ?? null;
  const editing = records.find((record) => record.chemical.id === editingId) ?? null;
  const facility = facilities.find((item) => item.id === state.facilityId);
  const yearLabel = state.year === "all" ? "All years" : String(state.year);
  const scopeLabel = facility ? facility.shortName : "All facilities";

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`${scopeLabel} · ${yearLabel}`}
        title="Inventory"
        description="On hand is container size times the number of containers."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add chemical
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_180px_190px] lg:items-center">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => patch({ q: event.target.value || null })}
            placeholder="Search name, CAS, manufacturer"
            aria-label="Search inventory"
            className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <Select value={state.facilityId} onValueChange={(value) => setFacility(value as FacilityId | "all")}>
          <SelectTrigger aria-label="Facility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All facilities</SelectItem>
            {customerFacilities.map((facility) => (
              <SelectItem key={facility.id} value={facility.id}>
                {facility.shortName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(state.year)}
          onValueChange={(value) => setYear(value === "all" ? "all" : (Number(value) as YearScope))}
        >
          <SelectTrigger aria-label="Year">
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
        <Select value={hazard} onValueChange={(value) => patch({ hazard: value === "all" ? null : value })}>
          <SelectTrigger aria-label="Hazard class">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All hazards</SelectItem>
            {HAZARD_CLASSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {filtered.length} chemical{filtered.length === 1 ? "" : "s"}
        </p>
        <label className="flex items-center gap-2 lg:hidden">
          <span className="text-[12px]">Sort</span>
          <select
            value={`${sort.key}-${sort.dir}`}
            onChange={(event) => {
              const [key, dir] = event.target.value.split("-") as [SortKey, "asc" | "desc"];
              setSort({ key, dir });
            }}
            className="h-8 rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="name-asc">Name</option>
            <option value="quantity-desc">Quantity</option>
            <option value="year-desc">Year</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-[15px]">Nothing matches</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another facility, year, or hazard class.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setFacility("all");
              setYear("all");
              patch({ q: null, hazard: null, id: null });
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-card lg:block">
            <Table>
              <caption className="sr-only">Chemical inventory</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortButton label="Product" active={sort.key === "name"} dir={sort.dir} onClick={() => toggleSort("name")} />
                  </TableHead>
                  <TableHead>CAS</TableHead>
                  {state.facilityId === "all" ? <TableHead>Facility</TableHead> : null}
                  <TableHead>
                    <SortButton label="Year" active={sort.key === "year"} dir={sort.dir} onClick={() => toggleSort("year")} />
                  </TableHead>
                  <TableHead>
                    <SortButton label="On hand" active={sort.key === "quantity"} dir={sort.dir} onClick={() => toggleSort("quantity")} />
                  </TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>SDS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((record) => {
                  const facility = facilities.find((item) => item.id === record.chemical.facilityId);
                  const open = () => patch({ id: record.chemical.id });
                  return (
                    <TableRow
                      key={record.chemical.id}
                      tabIndex={0}
                      data-state={selectedId === record.chemical.id ? "open" : undefined}
                      className="cursor-pointer"
                      onClick={open}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          open();
                        }
                      }}
                    >
                      <TableCell>
                        <span className="flex items-center gap-3">
                          <img
                            src={PACKAGING_IMAGE[record.chemical.packaging]}
                            alt=""
                            className="size-9 rounded-md object-cover"
                          />
                          <span>
                            <span className="block">{record.chemical.name}</span>
                            <span className="text-[12px] text-muted-foreground">{record.chemical.manufacturer}</span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-[13px]">{record.chemical.cas}</TableCell>
                      {state.facilityId === "all" ? <TableCell>{facility?.shortName}</TableCell> : null}
                      <TableCell className="font-mono">{record.chemical.year}</TableCell>
                      <TableCell className="font-mono text-[13px] tabular-nums">
                        {formatNumber(totalQuantity(record.chemical))} {record.chemical.unit}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-[13px] text-muted-foreground">
                        {locationLabel(record.chemical.locations[0])}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{formatDate(record.chemical.updatedAt)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={record.status}
                          revisionDate={record.pinned?.revisionDate ?? ""}
                          reviseBy={record.reviseBy}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-2 lg:hidden">
            {filtered.map((record) => (
              <li key={record.chemical.id}>
                <button
                  type="button"
                  onClick={() => patch({ id: record.chemical.id })}
                  className="flex w-full gap-3 rounded-xl border border-border bg-card shadow-card p-3 text-left"
                >
                  <img
                    src={PACKAGING_IMAGE[record.chemical.packaging]}
                    alt=""
                    className="size-16 rounded-md object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{record.chemical.name}</span>
                    <span className="mt-0.5 block font-mono text-[12px] text-muted-foreground">{record.chemical.cas}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                      {locationLabel(record.chemical.locations[0])}
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-[13px]">
                        {formatNumber(totalQuantity(record.chemical))} {record.chemical.unit}
                      </span>
                      <StatusBadge
                        status={record.status}
                        revisionDate={record.pinned?.revisionDate ?? ""}
                        reviseBy={record.reviseBy}
                      />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <ProductSheet
        record={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && patch({ id: null })}
        onEdit={() => {
          if (selected) setEditingId(selected.chemical.id);
        }}
      />
      {adding ? <AddChemicalDialog open onOpenChange={setAdding} /> : null}
      {editing ? (
        <AddChemicalDialog
          key={editing.chemical.id}
          open
          record={editing}
          onOpenChange={(open) => {
            if (!open) setEditingId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  const Icon = dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1", active && "text-foreground")}>
      {label}
      {active ? <Icon className="size-3" /> : null}
    </button>
  );
}
