import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Chemical, StockLocation } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function locationQuantity(location: StockLocation) {
  return location.containerSize * location.containerCount;
}

export function totalQuantity(chemical: Chemical) {
  return chemical.locations.reduce((sum, location) => sum + locationQuantity(location), 0);
}

export function isIncomplete(chemical: Chemical) {
  if (!chemical.sdsId || !chemical.sdsVersionId) return true;
  if (chemical.ingredients.length === 0) return true;
  if (chemical.locations.length === 0) return true;
  return chemical.locations.some((location) => location.containerSize <= 0 || location.containerCount <= 0);
}

export function isBelowMinimum(chemical: Chemical) {
  return chemical.reorderPoint > 0 && totalQuantity(chemical) < chemical.reorderPoint;
}

export function locationLabel(location: StockLocation) {
  return `${location.building} · ${location.room} · ${location.cabinet}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
