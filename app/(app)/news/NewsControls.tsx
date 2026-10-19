"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Languages, Loader2, RefreshCw, Search, X } from "lucide-react";
import { refreshNow, toggleNewsSelection, translateNews } from "@/lib/news/actions";
import { Button, cx } from "@/components/ui";

export function RefreshButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" disabled={pending} onClick={() => start(() => refreshNow())} icon={pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

type Option = { value: string; label: string };

/** Filters live in the URL so a filtered view can be reloaded or shared between the two users. */
export function NewsFilters({
  t,
  topics,
  locations,
  sources,
  periods,
}: {
  t: { search: string; all: string; location: string; source: string; period: string; sort: string; sortLocal: string; sortNewest: string; selectedOnly: string; hideDuplicates: string; clear: string };
  topics: Option[];
  locations: Option[];
  sources: Option[];
  periods: Option[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("id");
    start(() => router.replace(`/news?${next.toString()}`, { scroll: false }));
  };

  const topic = params.get("topic") ?? "";
  const hasFilters = ["q", "topic", "loc", "src", "days", "sel", "dup", "sort"].some((k) => params.has(k));

  const Select = ({ name, label, options, value, allLabel }: { name: string; label: string; options: Option[]; value: string; allLabel?: string }) => (
    <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-surface ps-3 pe-1 t-small text-ink-2">
      <span className="text-muted">{label}:</span>
      <select value={value} onChange={(e) => set({ [name]: e.target.value })} className="h-full cursor-pointer bg-transparent pe-2 font-medium text-ink outline-none">
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className={cx("flex flex-col gap-3 transition-opacity", pending && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-md border border-line bg-surface px-3 text-muted"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: q.trim() || null });
          }}
        >
          <Search className="size-4 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="t-small min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted" />
        </form>
        <Select name="loc" label={t.location} options={locations} value={params.get("loc") ?? ""} allLabel={t.all} />
        <Select name="src" label={t.source} options={sources} value={params.get("src") ?? ""} allLabel={t.all} />
        <Select name="days" label={t.period} options={periods} value={params.get("days") ?? "30"} />
        <Select name="sort" label={t.sort} options={[{ value: "local", label: t.sortLocal }, { value: "newest", label: t.sortNewest }]} value={params.get("sort") ?? "local"} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {[{ value: "", label: t.all }, ...topics].map((o) => (
          <button
            key={o.value || "all"}
            onClick={() => set({ topic: o.value || null })}
            className={cx("h-8 rounded-full border px-3 t-caption transition-colors", topic === o.value ? "border-accent bg-accent-tint font-semibold text-accent" : "border-line bg-surface text-ink-2 hover:bg-hover")}
          >
            {o.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        <label className="flex cursor-pointer items-center gap-1.5 t-caption text-ink-2">
          <input type="checkbox" className="accent-accent" checked={params.get("sel") === "1"} onChange={(e) => set({ sel: e.target.checked ? "1" : null })} />
          {t.selectedOnly}
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 t-caption text-ink-2">
          <input type="checkbox" className="accent-accent" checked={params.get("dup") !== "1"} onChange={(e) => set({ dup: e.target.checked ? null : "1" })} />
          {t.hideDuplicates}
        </label>
        {hasFilters && (
          <button onClick={() => { setQ(""); start(() => router.replace("/news", { scroll: false })); }} className="ms-auto flex items-center gap-1 t-caption text-accent">
            <X className="size-3.5" />
            {t.clear}
          </button>
        )}
      </div>
    </div>
  );
}

export function TranslateButton({ id, t }: { id: string; t: { translate: string; translating: string; translateError: string; translateErrors: Record<string, string> } }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await translateNews(id);
            if (r.error) setError(t.translateErrors[r.error] ?? t.translateError);
          })
        }
        icon={pending ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
      >
        {pending ? t.translating : t.translate}
      </Button>
      {error && <p className="t-caption text-negative" role="alert">{error}</p>}
    </div>
  );
}

export function SelectButton({ id, selected, t }: { id: string; selected: boolean; t: { select: string; selected: string } }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={selected ? "primary" : "secondary"}
      disabled={pending}
      aria-pressed={selected}
      onClick={() => start(() => toggleNewsSelection(id))}
      icon={pending ? <Loader2 className="size-4 animate-spin" /> : selected ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
    >
      {selected ? t.selected : t.select}
    </Button>
  );
}
