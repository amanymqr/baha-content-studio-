import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "@/lib/context";
import { dirOf } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Baha Content Studio",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body className="min-h-screen bg-canvas text-ink">{children}</body>
    </html>
  );
}
