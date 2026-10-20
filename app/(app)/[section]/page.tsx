import { notFound } from "next/navigation";
import { Hammer } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ButtonLink } from "@/components/ui";
import { getContext } from "@/lib/context";

const SECTIONS = ["reels", "carousel", "library", "calendar"] as const;

export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTIONS.includes(section as (typeof SECTIONS)[number])) notFound();
  const { t, locale } = await getContext();
  const title = t.nav[section as (typeof SECTIONS)[number]];
  return (
    <>
      <TopBar t={t} locale={locale} title={title} />
      <div className="p-10">
        <div className="card mx-auto flex max-w-xl flex-col items-center gap-4 p-12 text-center">
          <div className="grid size-12 place-items-center rounded-lg bg-accent-tint text-accent">
            <Hammer className="size-6" />
          </div>
          <h2 className="t-h2">{t.soon.title}</h2>
          <p className="t-body text-ink-2">{t.soon.body}</p>
          <ButtonLink href="/" variant="secondary">{t.soon.back}</ButtonLink>
        </div>
      </div>
    </>
  );
}
