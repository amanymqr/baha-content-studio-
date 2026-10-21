// Refreshes the news sources from the command line, the same way the app does.
// Safe to run while the app is running: writes go through the shared file lock.
//
//   npm run refresh              only sources whose last check is older than their interval
//   npm run refresh -- --force   every connected source now
import { refreshAll } from "../lib/sources/refresh";

const force = process.argv.includes("--force");

refreshAll({ force })
  .then(({ runs, skipped, store }) => {
    for (const r of runs) console.log(`${r.ok ? "ok    " : "failed"} ${r.sourceId.padEnd(8)} ${String(r.itemCount).padStart(4)} items  ${r.durationMs} ms${r.error ? `  ${r.error}` : ""}`);
    if (skipped.length) console.log(`not due (checked within their interval): ${skipped.join(", ")}`);
    console.log(`stories stored: ${Object.keys(store.items).length}; last refresh: ${store.lastRefresh ?? "never"}`);
    process.exit(runs.some((r) => !r.ok) ? 1 : 0);
  })
  .catch((e) => {
    console.error(`Refresh failed: ${(e as Error).message}`);
    process.exit(1);
  });
