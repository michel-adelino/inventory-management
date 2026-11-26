"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SdsDocument } from "@/components/sds/sds-document";
import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { facilities } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";

export function SdsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scoped, state } = useStore();
  const [isLarge, setIsLarge] = useState<boolean | null>(null);
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const selectedId = searchParams.get("id");

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsLarge(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function patch(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `/sds?${qs}` : "/sds", { scroll: false });
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scoped.filter((record) => {
      if (status !== "all" && record.status !== status) return false;
      if (!needle) return true;
      const haystack = `${record.chemical.name} ${record.chemical.cas} ${record.chemical.manufacturer}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [scoped, query, status]);

  const explicit = selectedId
    ? (filtered.find(
        (record) =>
          record.chemical.id === selectedId || record.document?.id === selectedId || record.chemical.sdsId === selectedId,
      ) ?? null)
    : null;
  const desktopRecord = explicit ?? filtered[0] ?? null;
  const facility = facilities.find((item) => item.id === state.facilityId);
  const yearLabel = state.year === "all" ? "All years" : String(state.year);
  const scopeLabel = facility ? facility.shortName : "All facilities";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`${scopeLabel} · ${yearLabel}`}
        title="Safety data sheets"
        description="Each inventory year keeps the SDS version filed with that year."
      />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => patch({ q: event.target.value || null, id: null })}
            placeholder="Search sheets"
            aria-label="Search safety data sheets"
            className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <Select value={status} onValueChange={(value) => patch({ status: value === "all" ? null : value, id: null })}>
          <SelectTrigger aria-label="Sheet status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All flags</SelectItem>
            <SelectItem value="current">Current</SelectItem>
            <SelectItem value="review">Needs review</SelectItem>
            <SelectItem value="outdated">Outdated</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-3 py-2 text-[12px] text-muted-foreground">
            {filtered.length} sheet{filtered.length === 1 ? "" : "s"}
          </div>
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-sm text-muted-foreground">No sheets match these filters.</p>
          ) : (
            <ScrollArea className="h-[min(70vh,760px)]">
              <ul>
                {filtered.map((record) => {
                  const facility = facilities.find((item) => item.id === record.chemical.facilityId);
                  const active = desktopRecord?.chemical.id === record.chemical.id;
                  return (
                    <li key={record.chemical.id}>
                      <button
                        type="button"
                        onClick={() => patch({ id: record.chemical.id })}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 border-b border-border px-3 py-3 text-left",
                          active && "bg-secondary",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm">{record.chemical.name}</span>
                          <span className="mt-0.5 block text-[12px] text-muted-foreground">
                            {facility?.shortName} · {record.chemical.year}
                            {record.pinned ? ` · ${formatDate(record.pinned.revisionDate)}` : " · No sheet"}
                          </span>
                        </span>
                        <StatusBadge
                          status={record.status}
                          revisionDate={record.pinned?.revisionDate ?? ""}
                          reviseBy={record.reviseBy}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </div>

        <div className="hidden xl:block">
          {desktopRecord ? (
            <SdsDocument record={desktopRecord} />
          ) : (
            <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
              No sheet to preview.
            </div>
          )}
        </div>
      </div>

      <Sheet open={Boolean(explicit) && isLarge === false} onOpenChange={(open) => !open && patch({ id: null })}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader className="flex flex-row items-center justify-between gap-3">
            <SheetTitle className="min-w-0 truncate">{explicit?.chemical.name ?? "Safety data sheet"}</SheetTitle>
            <SheetClose className="mr-8 shrink-0 rounded-md border border-border px-2.5 py-1 text-sm hover:bg-secondary">
              Close
            </SheetClose>
          </SheetHeader>
          <SheetBody className="px-0 py-0">
            {explicit ? <SdsDocument record={explicit} /> : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
