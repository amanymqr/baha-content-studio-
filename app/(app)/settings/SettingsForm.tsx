"use client";

import { useState, useTransition } from "react";
import { Bell, BookMarked, Check, Globe, Wand2 } from "lucide-react";
import type { Dict } from "@/lib/i18n";
import type { ContentLanguage, Locale, User, UserSettings } from "@/lib/db";
import { saveSettings } from "@/lib/actions";
import { Button, Chip, Toggle, cx } from "@/components/ui";

type U = { id: User["id"]; name: string; role: string; initials: string; interfaceLanguage: Locale };

function Card({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-6 p-6">
      <div className="flex items-start gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-tint text-accent">{icon}</div>
        <div>
          <h2 className="t-h2">{title}</h2>
          <p className="t-small text-ink-2">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Row({ title, body, checked, onChange }: { title: string; body: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-4 border-b border-line py-4 last:border-0">
      <div className="flex-1">
        <div className="t-h3">{title}</div>
        <div className="t-small text-ink-2">{body}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export function SettingsForm({ t, meId, users, settings }: { t: Dict["settings"]; meId: User["id"]; users: U[]; settings: UserSettings }) {
  const [languages, setLanguages] = useState<Record<string, Locale>>(Object.fromEntries(users.map((u) => [u.id, u.interfaceLanguage])));
  const [content, setContent] = useState<ContentLanguage>(settings.contentLanguage);
  const [notifications, setNotifications] = useState(settings.notifications);
  const [explanations, setExplanations] = useState(settings.explanations);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const reset = () => {
    setLanguages(Object.fromEntries(users.map((u) => [u.id, u.interfaceLanguage])));
    setContent(settings.contentLanguage);
    setNotifications(settings.notifications);
    setExplanations(settings.explanations);
  };
  const save = () =>
    start(async () => {
      await saveSettings({ contentLanguage: content, notifications, explanations }, languages);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });

  const contentOptions: { id: ContentLanguage; title: string; body: string; tag?: string; tagLtr?: boolean }[] = [
    { id: "both", title: t.contentBoth, body: t.contentBothBody },
    { id: "en", title: t.contentEn, body: t.contentEnBody, tag: "Canadian English", tagLtr: true },
    { id: "ar", title: t.contentAr, body: t.contentArBody, tag: t.contentArTag },
  ];

  return (
    <div className="flex flex-col gap-6 p-10">
      <div className="flex items-start gap-4 rounded-xl border border-accent-soft bg-accent-tint px-6 py-5">
        <Globe className="mt-1 size-5 shrink-0 text-accent" />
        <div>
          <div className="t-h3 font-semibold text-accent-strong">{t.principleTitle}</div>
          <div className="t-small text-ink-2">{t.principleBody}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 items-start gap-6">
        <div className="flex flex-col gap-6">
          <Card icon={<Globe className="size-5" />} title={t.interfaceTitle} sub={t.interfaceSub}>
            <div className="flex flex-col gap-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 rounded-lg border border-line bg-canvas p-4">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-tint t-caption font-semibold text-accent">{u.initials}</div>
                  <div className="min-w-0 flex-1">
                    <div className="t-h3">{u.id === meId ? `${t.you} · ${u.role}` : `${u.name} · ${u.role}`}</div>
                    <div className="t-caption text-ink-2">{u.id === meId ? t.defaultForYou : t.bahaHint}</div>
                  </div>
                  <div className="flex shrink-0 gap-1 rounded-md bg-elevated p-1" dir="ltr">
                    {(["en", "ar"] as Locale[]).map((l) => (
                      <button
                        key={l}
                        type="button"
                        lang={l}
                        aria-pressed={languages[u.id] === l}
                        onClick={() => setLanguages((s) => ({ ...s, [u.id]: l }))}
                        className={cx("flex h-9 items-center gap-1.5 rounded-[8px] px-3 t-small", languages[u.id] === l ? "bg-surface font-semibold text-ink shadow-soft" : "text-muted")}
                      >
                        {languages[u.id] === l && <Check className="size-4 text-accent" />}
                        {l === "ar" ? t.arabic : t.english}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card icon={<Wand2 className="size-5" />} title={t.contentTitle} sub={t.contentSub}>
            <div className="grid grid-cols-3 gap-3" role="radiogroup">
              {contentOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={content === o.id}
                  onClick={() => setContent(o.id)}
                  className={cx("flex flex-col gap-2 rounded-lg border p-4 text-start transition-colors", content === o.id ? "border-accent bg-accent-tint" : "border-line hover:bg-hover")}
                >
                  <span className="flex items-center gap-2">
                    <span className={cx("grid size-[18px] place-items-center rounded-full border-2", content === o.id ? "border-accent" : "border-line-strong")}>
                      {content === o.id && <span className="size-2 rounded-full bg-accent" />}
                    </span>
                    <span className="t-h3 font-semibold">{o.title}</span>
                    {o.id === "both" && <Chip tone="gold">{t.default}</Chip>}
                  </span>
                  <span className="t-small text-ink-2">{o.body}</span>
                  {o.tag && <Chip className={cx("self-start", o.tagLtr && "content-en")}>{o.tag}</Chip>}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-canvas p-4">
              <div className="content-ar">
                <div className="t-caption text-muted">{t.exampleAr}</div>
                <p className="t-h3">{t.exampleArText}</p>
              </div>
              <div className="content-en">
                <div className="t-caption text-muted">{t.exampleEn}</div>
                <p className="t-small">Waiting for rates to drop before you buy? Here&apos;s what the Bank of Canada just did.</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card icon={<Bell className="size-5" />} title={t.notifTitle} sub={t.notifSub}>
            <div>
              <Row title={t.notifNews} body={t.notifNewsBody} checked={notifications.officialNews} onChange={(v) => setNotifications((s) => ({ ...s, officialNews: v }))} />
              <Row title={t.notifOpp} body={t.notifOppBody} checked={notifications.strongOpportunity} onChange={(v) => setNotifications((s) => ({ ...s, strongOpportunity: v }))} />
              <Row title={t.notifPublish} body={t.notifPublishBody} checked={notifications.publishReminder} onChange={(v) => setNotifications((s) => ({ ...s, publishReminder: v }))} />
              <Row title={t.notifWeekly} body={t.notifWeeklyBody} checked={notifications.weeklySummary} onChange={(v) => setNotifications((s) => ({ ...s, weeklySummary: v }))} />
            </div>
          </Card>
          <Card icon={<BookMarked className="size-5" />} title={t.explainTitle} sub={t.explainSub}>
            <div>
              <Row title={t.explainMetric} body={t.explainMetricBody} checked={explanations.metricMeaning} onChange={(v) => setExplanations((s) => ({ ...s, metricMeaning: v }))} />
              <Row title={t.explainGlossary} body={t.explainGlossaryBody} checked={explanations.glossary} onChange={(v) => setExplanations((s) => ({ ...s, glossary: v }))} />
              <Row title={t.explainNews} body={t.explainNewsBody} checked={explanations.plainNews} onChange={(v) => setExplanations((s) => ({ ...s, plainNews: v }))} />
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending} icon={<Check className="size-4" />}>{saved ? t.saved : t.save}</Button>
        <Button variant="secondary" onClick={reset} disabled={pending}>{t.cancel}</Button>
      </div>
    </div>
  );
}
