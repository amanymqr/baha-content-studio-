"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, Clapperboard, Folder, Layers, LayoutGrid, LogOut, Menu, Newspaper, NotebookPen, Settings2, Sparkles, Target, TrendingUp, X } from "lucide-react";
import type { Dict } from "@/lib/i18n";
import { cx } from "./ui";
import { signOut } from "@/lib/actions";

type Item = { href: string; label: string; icon: typeof LayoutGrid; count?: number };

export function Sidebar({ t, user, locale }: { t: Pick<Dict, "nav" | "brand">; user: { name: string; role: string; initials: string }; locale: "ar" | "en" }) {
  const path = usePathname();
  const n = t.nav;
  const groups: { title: string; items: Item[] }[] = [
    {
      title: n.groupCreate,
      items: [
        { href: "/studio", label: n.studio, icon: NotebookPen },
        { href: "/reels", label: n.reels, icon: Clapperboard },
        { href: "/carousel", label: n.carousel, icon: Layers },
      ],
    },
    {
      title: n.groupResearch,
      items: [
        { href: "/news", label: n.news, icon: Newspaper },
        { href: "/analysis", label: n.analysis, icon: TrendingUp },
        { href: "/opportunities", label: n.opportunities, icon: Target },
      ],
    },
    { title: n.groupPublish, items: [{ href: "/library", label: n.library, icon: Folder }, { href: "/calendar", label: n.calendar, icon: CalendarDays }] },
  ];

  const NavLink = ({ item }: { item: Item }) => {
    const active = item.href === "/studio" ? path.startsWith("/studio") : path === item.href;
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        className={cx("flex h-10 items-center gap-3 rounded-md px-3 t-small transition-colors", active ? "bg-accent-tint font-semibold text-ink" : "text-ink-2 hover:bg-hover")}
      >
        <Icon className={cx("size-5", active ? "text-accent" : "text-ink-2")} strokeWidth={1.75} />
        <span className="flex-1">{item.label}</span>
        {item.count !== undefined && (
          <span className={cx("rounded-full px-2 t-caption", active ? "bg-accent text-white" : "bg-elevated text-muted")}>{item.count}</span>
        )}
      </Link>
    );
  };

  const [open, setOpen] = useState(false);
  // Close the mobile drawer after navigating.
  useEffect(() => setOpen(false), [path]);

  const panel = (
    <aside className="sticky top-0 flex h-screen flex-col gap-6 overflow-y-auto px-5 py-6">
      <div className="flex items-center gap-3 px-1">
        <div className="grid size-10 place-items-center rounded-md bg-gradient-to-br from-[#e2c483] to-[#a07c2e] font-[family-name:var(--font-serif)] text-xl font-semibold text-white shadow-soft">
          {locale === "ar" ? "ب" : "B"}
        </div>
        <div className="min-w-0">
          <div className="t-h3 font-semibold leading-tight">{t.brand.name}</div>
          <div className="t-caption text-accent">{t.brand.tagline}</div>
        </div>
      </div>

      <Link href="/studio/new" className="flex h-[50px] items-center justify-center gap-2 rounded-md bg-accent t-h3 font-medium text-white shadow-glow hover:bg-accent-strong">
        <Sparkles className="size-[18px]" />
        {n.create}
      </Link>

      <nav className="flex flex-col gap-6">
        <NavLink item={{ href: "/", label: n.dashboard, icon: LayoutGrid }} />
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-1">
            <div className="t-overline px-3">{g.title}</div>
            {g.items.map((i) => (
              <NavLink key={i.href} item={i} />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-canvas p-4">
          <div className="flex items-center justify-between">
            <span className="t-small font-semibold text-ink">{n.weeklyPlan}</span>
            <span className="t-small font-semibold text-accent ltr">3/5</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full w-3/5 rounded-full bg-accent" />
          </div>
          <div className="t-caption text-ink-2">{n.weeklyPlanDetail}</div>
        </div>
        <div className="flex items-center gap-3 px-1">
          <div className="grid size-9 place-items-center rounded-full border border-accent-soft bg-accent-tint t-caption font-semibold text-accent">{user.initials}</div>
          <div className="min-w-0 flex-1">
            <div className="t-small font-medium">{user.name}</div>
            <div className="t-caption text-muted">{user.role}</div>
          </div>
          <Link href="/settings" aria-label={n.settings} className={cx("rounded-md p-1.5 hover:bg-hover", path === "/settings" ? "text-accent" : "text-ink-2")}>
            <Settings2 className="size-[18px]" />
          </Link>
          <form action={signOut}>
            <button aria-label={n.signOut} className="rounded-md p-1.5 text-muted hover:bg-hover">
              <LogOut className="size-[18px] rtl:-scale-x-100" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden w-[264px] shrink-0 border-e border-line bg-surface lg:block">{panel}</div>
      {/* Below desktop width the sidebar becomes a drawer. */}
      <button onClick={() => setOpen(true)} aria-label={n.menu} className="fixed bottom-4 end-4 z-40 grid size-12 place-items-center rounded-full bg-accent text-white shadow-glow lg:hidden">
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-[280px] max-w-[85vw] bg-surface shadow-lg">
            <button onClick={() => setOpen(false)} aria-label={n.close} className="absolute end-3 top-3 z-10 grid size-9 place-items-center rounded-md text-ink-2 hover:bg-hover"><X className="size-5" /></button>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}
