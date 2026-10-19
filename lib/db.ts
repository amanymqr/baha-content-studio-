import "server-only";
import { promises as fs } from "fs";
import path from "path";

// Local JSON store for version 1. It is replaced by Supabase in a later step;
// everything else talks to it only through the functions below.

export type Locale = "ar" | "en";
export type ContentLanguage = "ar" | "en" | "both";

export type UserSettings = {
  interfaceLanguage: Locale;
  contentLanguage: ContentLanguage;
  notifications: { officialNews: boolean; strongOpportunity: boolean; publishReminder: boolean; weeklySummary: boolean };
  explanations: { metricMeaning: boolean; glossary: boolean; plainNews: boolean };
};

export type User = {
  id: "amona" | "baha";
  name: { ar: string; en: string };
  role: { ar: string; en: string };
  initials: string;
  settings: UserSettings;
};

type Db = { users: User[] };

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const defaultSettings = (interfaceLanguage: Locale): UserSettings => ({
  interfaceLanguage,
  contentLanguage: "both",
  notifications: { officialNews: true, strongOpportunity: true, publishReminder: true, weeklySummary: false },
  explanations: { metricMeaning: true, glossary: true, plainNews: true },
});

const seed: Db = {
  users: [
    {
      id: "amona",
      name: { ar: "أمونة", en: "Amona" },
      role: { ar: "إدارة المحتوى اليومية", en: "Daily content manager" },
      initials: "AM",
      settings: defaultSettings("ar"),
    },
    {
      id: "baha",
      name: { ar: "بهاء الشريف", en: "Baha Al-Sharif" },
      role: { ar: "صاحب الحساب", en: "Account owner" },
      initials: "BA",
      settings: defaultSettings("ar"),
    },
  ],
};

async function read(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(DB_PATH, "utf8")) as Db;
  } catch {
    await write(seed);
    return structuredClone(seed);
  }
}

async function write(db: Db) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export async function listUsers() {
  return (await read()).users;
}

export async function getUser(id: string | undefined) {
  if (!id) return undefined;
  return (await read()).users.find((u) => u.id === id);
}

export async function updateSettings(id: User["id"], patch: Partial<UserSettings>) {
  const db = await read();
  const user = db.users.find((u) => u.id === id);
  if (!user) return;
  user.settings = { ...user.settings, ...patch };
  await write(db);
}
