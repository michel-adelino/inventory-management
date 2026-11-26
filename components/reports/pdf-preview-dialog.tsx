"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ReportPdfModel } from "@/components/reports/report-pdf";

export function PdfPreviewDialog({
  open,
  onOpenChange,
  model,
  fileName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: ReportPdfModel;
  fileName: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let objectUrl = "";
    setStatus("loading");
    setUrl(null);

    (async () => {
      try {
        const [{ pdf }, { ReportPdfDocument }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("@/components/reports/report-pdf"),
        ]);
        const blob = await pdf(<ReportPdfDocument model={model} />).toBlob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, model]);

  function download() {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(920px,calc(100vh-1.5rem))] max-h-none w-[calc(100%-1rem)] max-w-6xl">
        <DialogHeader className="flex flex-row items-center justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="truncate">{model.title}</DialogTitle>
            <DialogDescription className="truncate">
              {model.facilityName} · {model.yearLabel}
            </DialogDescription>
          </div>
          <Button type="button" size="sm" className="mr-8 shrink-0" disabled={!url} onClick={download}>
            <Download className="size-4" />
            Download
          </Button>
        </DialogHeader>
        <div className="min-h-0 flex-1 bg-[#E7E2D8]">
          {status === "loading" ? (
            <p className="px-6 py-16 text-center text-sm text-muted-foreground">Preparing the PDF…</p>
          ) : null}
          {status === "error" ? (
            <p className="px-6 py-16 text-center text-sm text-destructive">The PDF could not be prepared.</p>
          ) : null}
          {url ? <iframe title={`${model.title} PDF`} src={url} className="h-full w-full bg-white" /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
