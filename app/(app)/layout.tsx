import { Sidebar } from "@/components/Sidebar";
import { getContext } from "@/lib/context";
import { listDrafts } from "@/lib/studio/store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, locale, t } = await getContext();
  const drafts = await listDrafts().catch(() => null);
  const pipeline = drafts && { ready: drafts.filter((d) => d.status === "ready").length, total: drafts.length };
  return (
    <div className="flex min-h-screen">
      <Sidebar t={{ nav: t.nav, brand: t.brand }} locale={locale} user={{ name: user.name[locale], role: user.role[locale], initials: user.initials }} pipeline={pipeline} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
