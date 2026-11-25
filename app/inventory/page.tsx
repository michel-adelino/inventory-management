import { Suspense } from "react";
import type { Metadata } from "next";
import { InventoryView } from "@/components/inventory/inventory-view";
import { LoadingBlock } from "@/components/loading-block";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <InventoryView />
    </Suspense>
  );
}
