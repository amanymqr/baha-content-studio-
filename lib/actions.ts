"use server";

import { cookies, headers } from "next/headers";
import { checkPassword } from "./auth/password";
import { lockedUntil, recordFailure, recordSuccess } from "./auth/lockout";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser, updateSettings, type ContentLanguage, type Locale, type UserSettings } from "./db";
import { SESSION_COOKIE, requireUser } from "./session";
import { SESSION_MAX_AGE_S, sessionSecret, signSession } from "./session-token";

// Two private accounts, each with its own password hash (lib/auth/password.ts),
// and a server-side limit on failed attempts (lib/auth/lockout.ts).
export async function signIn(_: unknown, form: FormData) {
  const id = String(form.get("user"));
  const password = String(form.get("password") ?? "");
  const user = await getUser(id);
  if (!user) return { error: "credentials" as const };
  const secret = sessionSecret();
  if (!secret) return { error: "config" as const };
  try {
    if (await lockedUntil(user.id)) return { error: "locked" as const };
    const result = await checkPassword(user.id, password);
    if (result === "config") return { error: "config" as const };
    if (result === "bad") return { error: (await recordFailure(user.id)) ? ("locked" as const) : ("credentials" as const) };
    await recordSuccess(user.id);
  } catch (e) {
    // The attempt counter couldn't be read or saved: stay closed rather than allow unlimited tries.
    console.error("Sign-in unavailable:", (e as Error).message);
    return { error: "unavailable" as const };
  }
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(SESSION_COOKIE, signSession(user.id, secret), { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: SESSION_MAX_AGE_S });
  redirect("/");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

const LOCALES: Locale[] = ["ar", "en"];
const CONTENT_LANGUAGES: ContentLanguage[] = ["ar", "en", "both"];

/** Changes the interface language of the signed-in account only. */
export async function setInterfaceLanguage(locale: Locale) {
  const me = await requireUser();
  if (!LOCALES.includes(locale)) return;
  await updateSettings(me.id, { interfaceLanguage: locale });
  revalidatePath("/", "layout");
}

export async function setContentLanguage(lang: ContentLanguage) {
  const me = await requireUser();
  await updateSettings(me.id, { contentLanguage: lang });
  revalidatePath("/", "layout");
}

/** Saves the signed-in account's own settings. Each account's interface language is its own; nobody changes another account's settings. */
export async function saveSettings(patch: Pick<UserSettings, "interfaceLanguage" | "contentLanguage" | "notifications" | "explanations">) {
  const me = await requireUser();
  if (!LOCALES.includes(patch.interfaceLanguage) || !CONTENT_LANGUAGES.includes(patch.contentLanguage)) return;
  await updateSettings(me.id, {
    interfaceLanguage: patch.interfaceLanguage,
    contentLanguage: patch.contentLanguage,
    notifications: patch.notifications,
    explanations: patch.explanations,
  });
  revalidatePath("/", "layout");
}
