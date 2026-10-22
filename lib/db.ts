import "server-only";
import { promises as fs } from "fs";
import { dataFile, readJson, updateJson } from "./storage/json-file";

// Account settings in data/db.json, read and written through the safe JSON layer
// (lib/storage). Everything else talks to it only through the functions below.

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

// The file is created from the seed on first run. If it exists but can't be
// parsed, reading throws and nothing is written, so saved settings are never
// replaced by the defaults.
const file = () => dataFile("db.json");

async function read(): Promise<Db> {
  try {
    await fs.access(file());
  } catch {
    // First run: write the seed through the safe path (a concurrent first write keeps whichever came first).
    return updateJson(file(), () => structuredClone(seed), (db) => db);
  }
  return readJson(file(), () => structuredClone(seed));
}

export async function listUsers() {
  return (await read()).users;
}

export async function getUser(id: string | undefined) {
  if (!id) return undefined;
  return (await read()).users.find((u) => u.id === id);
}

export async function updateSettings(id: User["id"], patch: Partial<UserSettings>) {
  await updateJson(file(), () => structuredClone(seed), (db) => {
    const user = db.users.find((u) => u.id === id);
    if (user) user.settings = { ...user.settings, ...patch };
  });
}
