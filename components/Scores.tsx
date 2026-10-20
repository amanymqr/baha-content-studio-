import { Gauge } from "lucide-react";
import type { Score } from "@/lib/analysis/score";
import type { Locale } from "@/lib/db";
import { Bidi, cx } from "./ui";

const tone = (v: number) => (v >= 70 ? "text-positive" : v >= 45 ? "text-accent" : "text-muted");

/** A 0–100 score with its label; colour only reinforces the number. */
export function ScoreBadge({ value, label, size = "md" }: { value: number; label?: string; size?: "md" | "lg" }) {
  return (
    <span className="inline-flex items-baseline gap-1" title={label}>
      <span className={cx("ltr font-semibold tabular-nums", size === "lg" ? "t-metric" : "t-h3", tone(value))}>{value}</span>
      <span className="ltr t-caption text-muted">/100</span>
    </span>
  );
}

/** Every rule that added or removed points, with the points it gave. */
export function ScoreReasons({ score, locale, pts }: { score: Score; locale: Locale; pts: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {score.reasons.map((r, i) => (
        <li key={i} className="flex items-start justify-between gap-3 t-small">
          <span className="text-ink-2"><Bidi>{r.text[locale]}</Bidi></span>
          <span className={cx("ltr shrink-0 font-semibold tabular-nums", r.points > 0 ? "text-ink" : r.points < 0 ? "text-negative" : "text-muted")}>
            {r.points > 0 ? `+${r.points}` : r.points} {pts}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function HeuristicNote({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-warning-tint p-3 t-caption text-ink-2">
      <Gauge className="mt-0.5 size-4 shrink-0 text-warning" />
      <span><span className="font-semibold text-ink">{title}: </span>{note}</span>
    </div>
  );
}
