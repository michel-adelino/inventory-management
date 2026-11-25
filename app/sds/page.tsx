import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingBlock } from "@/components/loading-block";
import { SdsView } from "@/components/sds/sds-view";

export const metadata: Metadata = { title: "Safety data sheets" };

export default function SdsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <SdsView />
    </Suspense>
  );
}
