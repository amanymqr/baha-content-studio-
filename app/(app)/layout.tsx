import { Sidebar } from "@/components/Sidebar";
import { getContext } from "@/lib/context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, locale, t } = await getContext();
  return (
    <div className="flex min-h-screen">
      <Sidebar t={{ nav: t.nav, brand: t.brand }} locale={locale} user={{ name: user.name[locale], role: user.role[locale], initials: user.initials }} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
