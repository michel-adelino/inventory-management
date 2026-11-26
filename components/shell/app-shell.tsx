"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileBarChart, Files, FlaskConical, LayoutDashboard, Menu, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { customers, facilities } from "@/lib/data";
import { YEARS } from "@/lib/labels";
import { useStore, type YearScope } from "@/lib/store";
import type { CustomerId, FacilityId } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: FlaskConical },
  { href: "/sds", label: "Safety data sheets", icon: Files },
  { href: "/reports", label: "Reporting", icon: FileBarChart },
];

function Brand() {
  return (
    <Link href="/" className="block px-5 pt-6 pb-5">
      <p className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">Northline</p>
      <p className="mt-1 text-[12px] text-muted-foreground">Chemical inventory</p>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Primary">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function WorkspaceMark() {
  return (
    <div className="mt-auto border-t border-border px-4 py-4">
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
          EH
        </span>
        <div>
          <p className="text-[13px] font-medium text-foreground">Plant EHS</p>
          <p className="text-[11px] text-muted-foreground">Sample workspace</p>
        </div>
      </div>
    </div>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const { records, state, setFacility, setYear } = useStore();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return [];
    return records
      .filter((record) => {
        const facility = facilities.find((item) => item.id === record.chemical.facilityId);
        if (facility?.customerId !== state.customerId) return false;
        const haystack = `${record.chemical.name} ${record.chemical.cas} ${record.chemical.manufacturer}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  }, [records, state.customerId, term]);

  useEffect(() => {
    setActiveIndex(0);
  }, [term]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, []);

  function go(href: string) {
    router.push(href);
    setTerm("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function openRecord(record: (typeof results)[number]) {
    setFacility(record.chemical.facilityId);
    setYear(record.chemical.year);
    go(`/inventory?id=${record.chemical.id}`);
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 lg:max-w-md">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={term}
        role="combobox"
        aria-expanded={open && term.trim().length > 0}
        aria-controls="global-search-results"
        aria-label="Search chemicals or CAS numbers"
        placeholder="Search chemicals or CAS"
        className="h-9 w-full rounded-md border border-input bg-card pr-16 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (!results.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % results.length);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => (index - 1 + results.length) % results.length);
          }
          if (event.key === "Enter") {
            event.preventDefault();
            const record = results[activeIndex];
            if (record) openRecord(record);
          }
        }}
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
        Ctrl K
      </kbd>
      {open && term.trim() ? (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-40 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">No chemicals match that search.</p>
          ) : (
            results.map((record, index) => (
              <div
                key={record.chemical.id}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0",
                  index === activeIndex && "bg-secondary",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openRecord(record)}
                >
                  <span className="block truncate text-sm">{record.chemical.name}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                    {record.chemical.cas} · {record.chemical.manufacturer}
                  </span>
                </button>
                <StatusBadge
                  status={record.status}
                  revisionDate={record.pinned?.revisionDate ?? ""}
                  reviseBy={record.reviseBy}
                />
                <button
                  type="button"
                  className="text-[12px] text-primary"
                  onClick={() => {
                    setFacility(record.chemical.facilityId);
                    setYear(record.chemical.year);
                    go(`/sds?id=${record.chemical.id}`);
                  }}
                >
                  SDS
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { state, setCustomer, setFacility, setYear } = useStore();
  const customerFacilities = facilities.filter((facility) => facility.customerId === state.customerId);

  return (
    <div className="flex min-h-screen">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[90] focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="app-sidebar no-print sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        <Brand />
        <NavLinks />
        <WorkspaceMark />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-topbar no-print sticky top-0 z-30 flex flex-col gap-2 border-b border-border bg-card/95 px-3 py-2 backdrop-blur sm:px-6 lg:h-14 lg:flex-row lg:items-center lg:gap-3 lg:py-0">
          <div className="flex min-w-0 items-center gap-2 lg:flex-1">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <GlobalSearch />
          </div>
          <div className="grid grid-cols-3 gap-1.5 lg:flex lg:shrink-0">
            <Select value={state.customerId} onValueChange={(value) => setCustomer(value as CustomerId)}>
              <SelectTrigger className="w-full lg:w-[148px]" aria-label="Customer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={state.facilityId} onValueChange={(value) => setFacility(value as FacilityId | "all")}>
              <SelectTrigger className="w-full lg:w-[150px]" aria-label="Facility">
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
            <Select value={String(state.year)} onValueChange={(value) => setYear(value === "all" ? "all" : Number(value) as YearScope)}>
              <SelectTrigger className="w-full lg:w-[108px]" aria-label="Inventory year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>
        <main id="content" className="app-main mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="bg-card text-foreground">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Brand />
          <NavLinks onNavigate={() => setMenuOpen(false)} />
          <WorkspaceMark />
        </SheetContent>
      </Sheet>
    </div>
  );
}
