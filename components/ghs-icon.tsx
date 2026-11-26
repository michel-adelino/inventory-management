import { cn } from "@/lib/utils";
import type { Pictogram } from "@/lib/types";

const symbols: Record<Pictogram, string> = {
  flame:
    "M32 16c1.2 4.2 6.4 6.2 6.4 13.2 0 4.6-3.2 7.6-6.4 7.6s-6.4-3-6.4-7.6c0-3.2 1.4-5.2 3-7 .2 2.4 1.6 3.4 3.4 3.4 0-4.6-.4-7.2 0-9.6z",
  corrosion:
    "M22 18h6l-2 8h-2l-2-8zm14 0h6l-1.2 5.2c2 .8 3.2 2.2 3.2 4.2 0 2.6-2.2 4.4-5.2 4.4-2.4 0-4.2-1.2-5-2.8l1.8-1c.4.8 1.2 1.4 2.4 1.4 1.4 0 2.2-.8 2.2-1.8s-.8-1.6-2.4-2.2L42 18zM24 40h20v3H24z",
  health:
    "M32 16a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-4 8h8l2 6-4 12h-4l-4-12 2-6zm-6 2 4 2-2 6-4-1 2-7zm16 0 2 7-4 1-2-6 4-2z",
  exclamation: "M30 18h4v16h-4V18zm0 20h4v4h-4v-4z",
  oxidizer:
    "M32 16a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3.2c.8 2.6 4 4 4 8.2a4 4 0 1 1-8 0c0-2 .8-3.2 1.8-4.2.2 1.4 1 2 2.2 2 0-2.8-.2-4.4 0-6z",
  environment:
    "M30 18h4v8h6l-8 14-8-14h6v-8zm-8 26h20v3H22z",
};

export function GhsIcon({ name, className }: { name: Pictogram; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-10 shrink-0", className)} aria-hidden>
      <path d="M32 4 60 32 32 60 4 32Z" fill="#fff" stroke="#dc2626" strokeWidth="2.4" />
      <path d={symbols[name]} fill="#0f172a" />
    </svg>
  );
}
