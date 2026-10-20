"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { Button, cx } from "./ui";

// Toasts and a confirm dialog shared by the studio editor and the content library.

export type Toast = { text: string; tone: "ok" | "error" } | null;

export function useToast() {
  const [toast, setToast] = useState<Toast>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);
  const view = toast && (
    <div role="status" aria-live="polite" className={cx("fixed bottom-6 start-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-2.5 t-small font-medium text-white shadow-lg rtl:translate-x-1/2", toast.tone === "ok" ? "bg-ink" : "bg-negative")}>
      {toast.tone === "ok" ? <CircleCheck className="size-4 shrink-0" /> : <CircleAlert className="size-4 shrink-0" />}
      {toast.text}
    </div>
  );
  return { show: setToast, view };
}

type Ask = { title: string; body?: string; confirm: string; cancel: string; danger?: boolean };

/** Promise-based confirm dialog: `if (await confirm({...})) doIt()`. Uses the native <dialog> for focus and Escape handling. */
export function useConfirm() {
  const ref = useRef<HTMLDialogElement>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((a: Ask) => {
    setAsk(a);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (ask && ref.current && !ref.current.open) ref.current.showModal();
  }, [ask]);

  const close = (ok: boolean) => {
    ref.current?.close();
    resolver.current?.(ok);
    resolver.current = null;
    setAsk(null);
  };

  const view = (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); close(false); }}
      onClick={(e) => e.target === ref.current && close(false)}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-0 text-ink shadow-lg backdrop:bg-ink/40"
    >
      {ask && (
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start gap-3">
            <span className={cx("grid size-10 shrink-0 place-items-center rounded-full", ask.danger ? "bg-negative-tint text-negative" : "bg-warning-tint text-warning")}>
              <TriangleAlert className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="t-h3 font-semibold">{ask.title}</h2>
              {ask.body && <p className="t-small text-ink-2">{ask.body}</p>}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => close(false)} autoFocus>{ask.cancel}</Button>
            <Button onClick={() => close(true)} className={ask.danger ? "bg-negative shadow-none hover:bg-negative/90" : undefined}>{ask.confirm}</Button>
          </div>
        </div>
      )}
    </dialog>
  );
  return { confirm, view };
}
