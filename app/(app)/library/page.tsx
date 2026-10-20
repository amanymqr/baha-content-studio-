import { TriangleAlert } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { getContext } from "@/lib/context";
import { summarize, type LibraryFilter } from "@/lib/studio/library";
import { readDrafts } from "@/lib/studio/store";
import { STATUSES, type DraftFormat, type DraftLanguage, type DraftStatus } from "@/lib/studio/types";
import { LibraryView } from "./LibraryView";

export const dynamic = "force-dynamic";

type Search = { q?: string; format?: string; language?: string; status?: string; from?: string; to?: string };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Reads the filters from the URL, ignoring anything that isn't a known value. */
function filterOf(sp: Search): LibraryFilter {
  return {
    q: sp.q?.slice(0, 200) || undefined,
    format: (["reel", "carousel"] as DraftFormat[]).includes(sp.format as DraftFormat) ? (sp.format as DraftFormat) : undefined,
    language: (["ar", "en", "both"] as DraftLanguage[]).includes(sp.language as DraftLanguage) ? (sp.language as DraftLanguage) : undefined,
    status: STATUSES.includes(sp.status as DraftStatus) ? (sp.status as DraftStatus) : undefined,
    from: sp.from && DATE.test(sp.from) ? sp.from : undefined,
    to: sp.to && DATE.test(sp.to) ? sp.to : undefined,
  };
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { t, locale } = await getContext();
  const l = t.library;
  const result = await readDrafts().catch(() => null);

  return (
    <>
      <TopBar t={t} locale={locale} title={l.title} subtitle={l.subtitle} />
      {!result ? (
        <div className="px-4 pt-6 md:px-10">
          <p role="alert" className="card flex items-start gap-2 border-negative/30 bg-negative-tint p-5 t-small text-negative"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{l.loadError}</p>
        </div>
      ) : (
        // Keyed by the URL filters so a search from the top bar starts a fresh view.
        <LibraryView key={JSON.stringify(filterOf(sp))} drafts={result.drafts.map((d) => summarize(d, locale))} unreadable={result.unreadable} initial={filterOf(sp)} t={t.library} s={t.studio} locale={locale} />
      )}
    </>
  );
}
