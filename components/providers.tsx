"use client";

import { type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <TooltipProvider delayDuration={250}>
        {children}
        <Toaster />
      </TooltipProvider>
    </StoreProvider>
  );
}
