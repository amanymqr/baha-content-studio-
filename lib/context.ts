import "server-only";
import { cookies } from "next/headers";
import { dictionaries } from "./i18n";
import type { Locale } from "./db";
import { currentUser, requireUser } from "./session";

export const LOCALE_COOKIE = "studio_locale";

// Arabic is the default whenever no account is signed in.
export async function getLocale(): Promise<Locale> {
  const user = await currentUser();
  if (user) return user.settings.interfaceLanguage;
  return (await cookies()).get(LOCALE_COOKIE)?.value === "en" ? "en" : "ar";
}

export async function getContext() {
  const user = await requireUser();
  const locale = user.settings.interfaceLanguage;
  return { user, locale, t: dictionaries[locale] };
}
