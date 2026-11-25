import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata: Metadata = { title: "Reporting" };

export default function ReportsPage() {
  return <ReportsView />;
}
