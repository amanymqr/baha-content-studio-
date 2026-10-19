import { Loader2 } from "lucide-react";
import { getContext } from "@/lib/context";

/** Shown while the page fetches the feeds (first load, or when the cache is stale). */
export default async function NewsLoading() {
  const { t } = await getContext();
  return (
    <div className="flex flex-col gap-6 p-8" aria-busy="true">
      <div className="flex items-center gap-2 t-small text-ink-2" role="status">
        <Loader2 className="size-4 animate-spin text-accent" />
        {t.news.loading}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card h-20 animate-pulse bg-hover" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-hover" />
          ))}
        </div>
        <div className="card h-96 animate-pulse bg-hover" />
      </div>
    </div>
  );
}
