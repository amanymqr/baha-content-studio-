"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";

// Shown when a page inside the app fails, for example when a data file can't be
// read. The storage layer never writes over a file it can't read, so the message
// can say the data was left as it was. Details stay in the server log.
const TEXT = {
  ar: {
    title: "ما قدرنا نفتح هالصفحة",
    body: "صار خطأ وقت تحميل البيانات. إذا كان السبب ملف بيانات تالف بمجلد data/، فالملف ما انكتب عليه وما تغيّر. التفاصيل بسجل الخادم، وبتقدري تستعيدي نسخة احتياطية بـ npm run restore-backup.",
    retry: "جرّبي كمان مرة",
    home: "لوحة التحكم",
  },
  en: {
    title: "This page couldn't be opened",
    body: "Something went wrong while loading the data. If a data file in data/ is damaged, it was not written over and is unchanged. Details are in the server log; a backup can be restored with npm run restore-backup.",
    retry: "Try again",
    home: "Dashboard",
  },
};

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  useEffect(() => {
    setLang(document.documentElement.lang === "en" ? "en" : "ar");
    console.error(error);
  }, [error]);
  const t = TEXT[lang];
  return (
    <div className="px-4 pt-10 md:px-10">
      <div role="alert" className="card mx-auto flex max-w-xl flex-col items-center gap-4 p-10 text-center">
        <div className="grid size-12 place-items-center rounded-lg bg-negative-tint text-negative">
          <TriangleAlert className="size-6" />
        </div>
        <h1 className="t-h2">{t.title}</h1>
        <p className="t-body text-ink-2">{t.body}</p>
        {error.digest && <p className="ltr t-caption text-muted">ref: {error.digest}</p>}
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="h-10 rounded-md bg-accent px-4 t-small font-medium text-white hover:bg-accent-strong">{t.retry}</button>
          <a href="/" className="flex h-10 items-center rounded-md border border-line px-4 t-small font-medium text-ink hover:bg-hover">{t.home}</a>
        </div>
      </div>
    </div>
  );
}
