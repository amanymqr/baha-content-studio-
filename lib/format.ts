import type { Locale } from "./db";

/** Dates in Toronto time, with Western digits in Arabic. */
export const formatDate = (locale: Locale, iso: string, withTime = false) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "America/Toronto",
  }).format(new Date(iso));
