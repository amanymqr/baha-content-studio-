import { Chip } from "./ui";
import type { DraftStatus } from "@/lib/studio/types";

/** One colour per workflow stage, used everywhere a draft's status is shown. */
export const STATUS_TONE = { draft: "neutral", review: "warning", changes: "negative", approved: "accent", ready: "positive" } as const satisfies Record<DraftStatus, string>;

export function StatusChip({ status, label, className }: { status: DraftStatus; label: string; className?: string }) {
  return <Chip tone={STATUS_TONE[status]} dot className={className}>{label}</Chip>;
}
