import { TopBar } from "@/components/TopBar";
import { getContext } from "@/lib/context";
import { listUsers } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const { t, locale, user } = await getContext();
  const users = (await listUsers()).map((u) => ({
    id: u.id,
    name: u.name[locale],
    role: u.role[locale],
    initials: u.initials,
    interfaceLanguage: u.settings.interfaceLanguage,
  }));
  return (
    <>
      <TopBar t={t} locale={locale} title={t.settings.title} subtitle={t.settings.subtitle} />
      <SettingsForm t={t.settings} meId={user.id} users={users} settings={user.settings} />
    </>
  );
}
