"use client";

import { useActionState, useState } from "react";
import { signIn } from "@/lib/actions";
import type { Dict } from "@/lib/i18n";
import { Button, cx } from "@/components/ui";

type U = { id: string; name: string; role: string; initials: string };

export function LoginForm({ t, users }: { t: Dict["login"]; users: U[] }) {
  const [state, action, pending] = useActionState(signIn, null);
  const [selected, setSelected] = useState(users[0]?.id);
  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="t-small mb-2 text-ink-2">{t.account}</legend>
        {users.map((u) => (
          <label key={u.id} className={cx("flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors", selected === u.id ? "border-accent bg-accent-tint" : "border-line hover:bg-hover")}>
            <input type="radio" name="user" value={u.id} checked={selected === u.id} onChange={() => setSelected(u.id)} className="accent-accent" />
            <span className="grid size-9 place-items-center rounded-full bg-surface t-caption font-semibold text-accent">{u.initials}</span>
            <span className="flex flex-col">
              <span className="t-small font-medium">{u.name}</span>
              <span className="t-caption text-muted">{u.role}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className="t-small text-ink-2">{t.password}</span>
        <input name="password" type="password" required className="h-11 rounded-md border border-line-strong bg-surface px-3 outline-none focus:border-accent" />
      </label>
      {state?.error && <p role="alert" className="t-small text-negative">{state.error === "config" ? t.configError : t.error}</p>}
      <Button disabled={pending} className="h-11">{t.submit}</Button>
    </form>
  );
}
