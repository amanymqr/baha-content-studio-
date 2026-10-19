"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser, updateSettings, type ContentLanguage, type Locale, type User, type UserSettings } from "./db";
import { SESSION_COOKIE, requireUser } from "./session";

// Version 1 uses one shared local password. Real accounts move to Supabase Auth later.
const LOCAL_PASSWORD = process.env.LOCAL_PASSWORD ?? "studio";

export async function signIn(_: unknown, form: FormData) {
  const id = String(form.get("user"));
  const user = await getUser(id);
  if (!user || form.get("password") !== LOCAL_PASSWORD) return { error: true };
  (await cookies()).set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function setInterfaceLanguage(locale: Locale, userId?: User["id"]) {
  const me = await requireUser();
  await updateSettings(userId ?? me.id, { interfaceLanguage: locale });
  revalidatePath("/", "layout");
}

export async function setContentLanguage(lang: ContentLanguage) {
  const me = await requireUser();
  await updateSettings(me.id, { contentLanguage: lang });
  revalidatePath("/", "layout");
}

export async function saveSettings(patch: Pick<UserSettings, "contentLanguage" | "notifications" | "explanations">, languages: Partial<Record<User["id"], Locale>>) {
  const me = await requireUser();
  await updateSettings(me.id, patch);
  for (const [id, locale] of Object.entries(languages)) {
    if (locale) await updateSettings(id as User["id"], { interfaceLanguage: locale });
  }
  revalidatePath("/", "layout");
}
