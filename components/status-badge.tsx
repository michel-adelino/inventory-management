"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_LABEL } from "@/lib/labels";
import { statusDetail } from "@/lib/sds";
import type { SdsStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<SdsStatus, string> = {
  current: "bg-ok-soft text-ok",
  review: "bg-review-soft text-review",
  outdated: "bg-danger-soft text-destructive",
  missing: "bg-secondary text-foreground",
};

export function StatusBadge({
  status,
  revisionDate,
  reviseBy,
  className,
}: {
  status: SdsStatus;
  revisionDate: string;
  reviseBy: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Badge className={cn(styles[status], className)}>{STATUS_LABEL[status]}</Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>{statusDetail(status, reviseBy, revisionDate)}</TooltipContent>
    </Tooltip>
  );
}
