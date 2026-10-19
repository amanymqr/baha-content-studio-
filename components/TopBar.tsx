import { Bell, Search } from "lucide-react";
import type { Dict } from "@/lib/i18n";
import type { Locale } from "@/lib/db";
import { LanguageToggle } from "./LanguageToggle";

export function TopBar({ t, locale, title, subtitle }: { t: Dict; locale: Locale; title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-20 items-center gap-4 border-b border-line bg-surface/90 px-8 backdrop-blur">
      <div className="min-w-0 flex-1">
        <h1 className="t-h2 truncate">{title}</h1>
        {subtitle && <p className="t-small truncate text-ink-2">{subtitle}</p>}
      </div>
      <label className="flex h-10 w-[300px] items-center gap-2 rounded-md border border-line bg-surface px-3 text-muted">
        <Search className="size-4 shrink-0" />
        <input placeholder={t.topbar.search} className="t-small min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted" />
        <kbd className="rounded bg-elevated px-1.5 t-caption text-muted ltr">⌘K</kbd>
      </label>
      <LanguageToggle locale={locale} labels={t.langToggle} />
      <button aria-label={t.topbar.notifications} className="relative grid size-10 place-items-center rounded-md border border-line bg-surface text-ink hover:bg-hover">
        <Bell className="size-[18px]" />
        <span className="absolute end-2 top-2 size-2 rounded-full border-2 border-surface bg-accent" />
      </button>
    </header>
  );
}
