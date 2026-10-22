import { notFound } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { aiCan } from "@/lib/ai";
import { getContext } from "@/lib/context";
import { listUsers } from "@/lib/db";
import { getDraft } from "@/lib/studio/store";
import { Editor } from "./Editor";

export const dynamic = "force-dynamic";

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, locale } = await getContext();
  const draft = await getDraft(id);
  if (!draft) notFound();
  const people = Object.fromEntries((await listUsers()).map((u) => [u.id, u.name[locale]]));
  return (
    <>
      <TopBar t={t} locale={locale} title={t.studio.title} subtitle={t.studio.noPublish} />
      <Editor initial={draft} t={t.studio} locale={locale} categoryLabel={t.analysis.category} aiWriting={aiCan("reelScript")} now={Date.now()} people={people} />
    </>
  );
}
