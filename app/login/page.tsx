import { redirect } from "next/navigation";
import { listUsers } from "@/lib/db";
import { devSharedPasswordUsers } from "@/lib/auth/password";
import { currentUser } from "@/lib/session";
import { getLocale } from "@/lib/context";
import { dictionaries } from "@/lib/i18n";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const locale = await getLocale();
  const t = dictionaries[locale];
  const users = (await listUsers()).map((u) => ({ id: u.id, name: u.name[locale], role: u.role[locale], initials: u.initials }));
  // Development only: accounts still using the shared temporary password. Always empty in production.
  const devShared = devSharedPasswordUsers();
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-gradient-to-br from-[#e2c483] to-[#a07c2e] text-xl font-semibold text-white">{locale === "ar" ? "ب" : "B"}</div>
          <div>
            <div className="t-h3 font-semibold">{t.brand.name}</div>
            <div className="t-caption text-accent">{t.brand.tagline}</div>
          </div>
        </div>
        <h1 className="t-h1">{t.login.title}</h1>
        <p className="t-small mb-6 text-ink-2">{t.login.subtitle}</p>
        {devShared.length > 0 && (
          <p role="note" className="mb-4 rounded-md border border-warning/40 bg-warning-tint p-3 t-caption text-ink-2">
            {t.login.devInsecure.replace("{users}", users.filter((u) => (devShared as string[]).includes(u.id)).map((u) => u.name).join(locale === "ar" ? "، " : ", "))}
          </p>
        )}
        <LoginForm t={t.login} users={users} />
        <p className="t-caption mt-6 text-muted">{t.login.devNote}</p>
      </div>
    </div>
  );
}
