import { SOURCES, UNAVAILABLE_SOURCES } from "../news/sources";
import type { RegisteredSource } from "./types";

// Every source the platform knows about, with an honest status. Only "connected"
// sources are fetched; the rest are listed so the app can say why they are missing.
// Adding a source means adding an entry here (and an adapter for connected ones).

export const NEWS_REFRESH_MS = 30 * 60_000;

const connected: RegisteredSource[] = SOURCES.map((s) => ({
  id: s.id,
  name: s.name,
  home: s.home,
  kind: "news",
  status: "connected",
  refreshEveryMs: NEWS_REFRESH_MS,
}));

const unavailable: RegisteredSource[] = UNAVAILABLE_SOURCES.map((u) => ({
  id: u.id,
  name: u.name,
  home: u.home,
  kind: "news",
  status: "unavailable",
  note: u.reason,
}));

const licensed: RegisteredSource[] = [
  {
    id: "trreb-stats",
    name: { ar: "إحصاءات سوق TRREB الشهرية", en: "TRREB monthly market statistics" },
    home: "https://trreb.ca",
    kind: "data",
    status: "license",
    note: {
      ar: "منشورة كصفحات وملفات PDF بحقوق نشر. ما في استخراج آلي قبل مراجعة الشروط أو الحصول على إذن؛ الأرقام بتنضاف يدوياً مع المصدر والتاريخ.",
      en: "Published as copyrighted pages and PDFs. No automated extraction before the terms are reviewed or permission is granted; figures are entered by hand with source and date.",
    },
  },
  {
    id: "crea-stats",
    name: { ar: "إحصاءات CREA الوطنية", en: "CREA national statistics" },
    home: "https://www.crea.ca/housing-market-stats/",
    kind: "data",
    status: "license",
    note: {
      ar: "بيانات محمية بحقوق نشر وما لها واجهة عامة. بتحتاج مراجعة الشروط قبل أي استخدام آلي.",
      en: "Copyrighted data without a public API. Terms must be reviewed before any automated use.",
    },
  },
];

export const REGISTRY: readonly RegisteredSource[] = [...connected, ...unavailable, ...licensed];

export const connectedNewsSources = () => REGISTRY.filter((s) => s.kind === "news" && s.status === "connected");
