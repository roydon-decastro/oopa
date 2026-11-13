"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Cloudflare Turnstile bot check. Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

let loader: Promise<void> | null = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { loader = null; reject(new Error("Turnstile failed to load")); };
    document.head.appendChild(s);
  });
  return loader;
}

export type TurnstileHandle = { reset: () => void };

const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string | null) => void; onError?: () => void }>(
  function Turnstile({ onToken, onError }, ref) {
    const box = useRef<HTMLDivElement>(null);
    const widget = useRef<string | null>(null);
    const cb = useRef({ onToken, onError });
    cb.current = { onToken, onError };

    useImperativeHandle(ref, () => ({
      reset: () => {
        cb.current.onToken(null);
        if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
      },
    }));

    useEffect(() => {
      if (!TURNSTILE_SITE_KEY) return;
      let cancelled = false;
      loadScript().then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action: "signup",
          callback: (t: string) => cb.current.onToken(t),
          "expired-callback": () => cb.current.onToken(null),
          "error-callback": () => { cb.current.onToken(null); cb.current.onError?.(); },
        });
      }).catch(() => cb.current.onError?.());
      return () => {
        cancelled = true;
        if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
        widget.current = null;
      };
    }, []);

    if (!TURNSTILE_SITE_KEY) return null;
    return <div ref={box} className="min-h-[65px]" />;
  },
);

export default Turnstile;
