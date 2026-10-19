"use client";

import { useTransition } from "react";
import { setInterfaceLanguage } from "@/lib/actions";
import type { Locale } from "@/lib/db";
import { cx } from "./ui";

// Switches only the interface language of the signed-in account.
export function LanguageToggle({ locale, labels }: { locale: Locale; labels: { ar: string; en: string } }) {
  const [pending, start] = useTransition();
  const options: Locale[] = ["ar", "en"];
  return (
    <div className={cx("flex h-[38px] items-center gap-0.5 rounded-md border border-line bg-surface p-1", pending && "opacity-60")} dir="ltr">
      {options.slice().reverse().map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          onClick={() => locale !== l && start(() => setInterfaceLanguage(l))}
          className={cx(
            "h-full rounded-[8px] px-3 t-caption transition-colors",
            l === "ar" ? "font-[family-name:var(--font-ar)]" : "font-[family-name:var(--font-en)]",
            locale === l ? "bg-accent text-white" : "text-ink-2 hover:bg-hover",
          )}
        >
          {labels[l]}
        </button>
      ))}
    </div>
  );
}
