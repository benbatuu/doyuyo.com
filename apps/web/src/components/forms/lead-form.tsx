"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import clsx from "clsx";
import { Icons, buttonClass } from "@doyuyo/ui";

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "number" | "choice";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Half width on wide screens. */
  half?: boolean;
  /** 0-based step for multi-step forms. */
  step?: number;
  autoComplete?: string;
}

export interface FormLabels {
  submit: string;
  sending: string;
  next: string;
  back: string;
  stepOf: string; // "{current} / {total}"
  required: string;
  invalid: string;
  consent: string; // text before link
  consentLink: string;
  consentRequired: string;
  consentAgree: string;
  close: string;
  successTitle: string;
  successText: string;
  error: string;
  rateLimited: string;
  again: string;
}

const UTM_KEY = "doyuyo-utm";
const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
type TurnstileApi = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };

/** First-touch UTM: kept for the session so a lead found via an ad on page 1 still carries it on page 3. */
function readUtm() {
  try {
    const p = new URLSearchParams(window.location.search);
    const now = Object.fromEntries([...p.entries()].filter(([k]) => k.startsWith("utm_")));
    if (Object.keys(now).length) sessionStorage.setItem(UTM_KEY, JSON.stringify(now));
    return Object.keys(now).length ? now : JSON.parse(sessionStorage.getItem(UTM_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function LeadForm({
  type,
  locale,
  fields,
  labels,
  consentHref,
  stepTitles,
  tone = "light",
  defaults,
  submitLabel,
  consentBody,
}: {
  type: "contact" | "careers" | "investor";
  locale: string;
  fields: FieldDef[];
  labels: FormLabels;
  consentHref: string;
  stepTitles?: string[];
  tone?: "light" | "dark";
  defaults?: Record<string, string>;
  submitLabel?: string;
  consentBody?: ReactNode;
}) {
  const steps = useMemo(() => Math.max(1, ...fields.map((f) => (f.step ?? 0) + 1)), [fields]);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(defaults ?? {});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "limited">("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const captchaRef = useRef<HTMLDivElement>(null);
  const captchaId = useRef<string | undefined>(undefined);
  const [captchaToken, setCaptchaToken] = useState("");

  // Spam protection widget: only when a Turnstile site key is configured.
  useEffect(() => {
    if (!TURNSTILE_KEY || !captchaRef.current) return;
    const el = captchaRef.current;
    const mount = () => {
      const t = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (!t || captchaId.current) return;
      captchaId.current = t.render(el, { sitekey: TURNSTILE_KEY, theme: tone === "dark" ? "dark" : "light", callback: (tok: string) => setCaptchaToken(tok), "expired-callback": () => setCaptchaToken("") });
    };
    if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) return mount();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = mount;
    document.head.appendChild(s);
  }, [tone]);
  const draftKey = `doyuyo-draft-${type}`;

  // Keep a draft so a half-filled form survives a reload (multi-step investor form).
  useEffect(() => {
    try {
      const d = localStorage.getItem(draftKey);
      if (d) setValues((v) => ({ ...JSON.parse(d), ...v }));
    } catch {}
  }, [draftKey]);
  // Prefill choice fields from the URL (e.g. ?model=investor_only from a model card's CTA).
  useEffect(() => {
    const prefill = (e?: Event) => {
      const p = new URLSearchParams(window.location.search);
      const hashQ = window.location.hash.split("?")[1];
      if (hashQ) new URLSearchParams(hashQ).forEach((v, k) => p.set(k, v));
      for (const f of fields) {
        const v = p.get(f.name);
        if (v && f.options?.some((o) => o.value === v)) setValues((s) => ({ ...s, [f.name]: v }));
      }
      void e;
    };
    prefill();
    window.addEventListener("hashchange", prefill);
    return () => window.removeEventListener("hashchange", prefill);
  }, [fields]);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(values));
    } catch {}
  }, [values, draftKey]);

  const visible = fields.filter((f) => (f.step ?? 0) === step);
  const set = (name: string, v: string) => {
    setValues((s) => ({ ...s, [name]: v }));
    setErrors((e) => (e[name] ? { ...e, [name]: "" } : e));
  };

  const check = (list: FieldDef[]) => {
    const e: Record<string, string> = {};
    for (const f of list) {
      const v = (values[f.name] ?? "").trim();
      if (f.required && !v) e[f.name] = labels.required;
      else if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) e[f.name] = labels.invalid;
      else if (v && f.type === "tel" && v.replace(/\D/g, "").length < 10) e[f.name] = labels.invalid;
    }
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    return !first;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (step < steps - 1) {
      if (check(visible)) setStep(step + 1);
      return;
    }
    if (!check(fields)) {
      const firstBad = fields.find((f) => errors[f.name]);
      if (firstBad) setStep(firstBad.step ?? 0);
      return;
    }
    if (!consent) {
      setErrors((e) => ({ ...e, consent: labels.consentRequired }));
      return;
    }
    if (TURNSTILE_KEY && !captchaToken) {
      setErrors((e) => ({ ...e, captcha: labels.invalid }));
      return;
    }
    setState("sending");
    const honeypot = (formRef.current?.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch(`/api/forms/${type}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          consent: true,
          website: honeypot,
          turnstileToken: captchaToken,
          meta: {
            locale,
            pagePath: window.location.pathname,
            pageTitle: document.title,
            referrer: document.referrer || null,
            utm: readUtm(),
            screen: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });
      if (res.ok) {
        setState("done");
        try {
          localStorage.removeItem(draftKey);
        } catch {}
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (json.reason === "invalid" && json.errors) {
        setErrors(Object.fromEntries(Object.entries(json.errors as Record<string, string>).map(([k, v]) => [k, v === "required" ? labels.required : labels.invalid])));
        setState("idle");
      } else setState(res.status === 429 ? "limited" : "error");
    } catch {
      setState("error");
    }
  };

  const dark = tone === "dark";
  const input = clsx(
    "w-full rounded-2xl border-2 px-4 py-3 font-bold outline-none transition placeholder:font-normal",
    dark ? "border-white/15 bg-white/5 text-white placeholder:text-white/40 focus:border-amber-400" : "border-line bg-white placeholder:text-muted/60 focus:border-navy-900",
  );

  if (state === "done")
    return (
      <div role="status" className={clsx("rounded-[var(--radius-card)] p-8 text-center", dark ? "bg-white/5" : "bg-cream-50")}>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-ok text-3xl text-white">
          <Icons.Check />
        </span>
        <p className="display mt-5 text-3xl">{labels.successTitle}</p>
        <p className={clsx("mx-auto mt-2 max-w-md", dark ? "text-white/75" : "text-muted")}>{labels.successText}</p>
        <button type="button" onClick={() => (setState("idle"), setStep(0), setValues({}), setConsent(false))} className={buttonClass(dark ? "light" : "outline", "sm", "mt-6")}>
          {labels.again}
        </button>
      </div>
    );

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      {steps > 1 && (
        <div>
          <div className="flex items-center justify-between text-sm font-extrabold">
            <span>{stepTitles?.[step]}</span>
            <span className={dark ? "text-white/60" : "text-muted"}>{labels.stepOf.replace("{current}", String(step + 1)).replace("{total}", String(steps))}</span>
          </div>
          <div className={clsx("mt-2 h-2 overflow-hidden rounded-full", dark ? "bg-white/10" : "bg-line")}>
            <div className="h-full rounded-full bg-amber-400 transition-[width] duration-500" style={{ width: `${((step + 1) / steps) * 100}%` }} />
          </div>
        </div>
      )}

      {/* honeypot: hidden from people and screen readers */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute left-[-9999px] h-0 w-0 opacity-0" aria-hidden="true" />

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((f) => {
          const id = `${type}-${f.name}`;
          const err = errors[f.name];
          const common = { id, name: f.name, "aria-invalid": !!err || undefined, "aria-describedby": err ? `${id}-err` : undefined, required: f.required };
          return (
            <div key={f.name} className={clsx(!f.half && "sm:col-span-2")}>
              <label htmlFor={f.type === "choice" ? undefined : id} id={`${id}-label`} className="mb-1.5 block text-sm font-extrabold">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea {...common} rows={5} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} className={input} />
              ) : f.type === "select" ? (
                <select {...common} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} className={clsx(input, "appearance-none")}>
                  <option value="">—</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "choice" ? (
                <div role="radiogroup" aria-labelledby={`${id}-label`} className={clsx("grid gap-2", (f.options?.length ?? 0) >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                  {f.options?.map((o) => {
                    const on = values[f.name] === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        name={f.name}
                        onClick={() => set(f.name, o.value)}
                        className={clsx(
                          "rounded-2xl border-2 px-4 py-3 text-left font-bold transition",
                          on ? "border-amber-400 bg-amber-400 text-navy-900" : dark ? "border-white/15 hover:border-white/40" : "border-line bg-white hover:border-navy-900/40",
                        )}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  {...common}
                  type={f.type === "number" ? "text" : f.type}
                  inputMode={f.type === "number" ? "numeric" : f.type === "tel" ? "tel" : undefined}
                  autoComplete={f.autoComplete}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  className={input}
                />
              )}
              {err && (
                <p id={`${id}-err`} className="mt-1 text-sm font-bold text-red-500">
                  {err}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {step === steps - 1 && (
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => (setConsent(e.target.checked), setErrors((x) => ({ ...x, consent: "" })))} className="mt-0.5 size-5 shrink-0 accent-red-600" />
          <span>
            {labels.consent}{" "}
            {consentBody ? (
              <button type="button" onClick={(e) => (e.preventDefault(), dialogRef.current?.showModal())} className="font-bold underline underline-offset-4">
                {labels.consentLink}
              </button>
            ) : (
              <Link href={consentHref} target="_blank" className="font-bold underline underline-offset-4">
                {labels.consentLink}
              </Link>
            )}
            {errors.consent && <span className="mt-1 block font-bold text-red-500">{errors.consent}</span>}
          </span>
        </label>
      )}

      {(state === "error" || state === "limited") && (
        <p role="alert" className="rounded-2xl bg-red-600/10 p-3 text-sm font-bold text-red-600">
          {state === "limited" ? labels.rateLimited : labels.error}
        </p>
      )}

      {consentBody && (
        <dialog ref={dialogRef} aria-labelledby={`${type}-consent-title`} className="m-auto w-[min(720px,calc(100vw-2rem))] max-h-[85vh] rounded-3xl bg-white p-0 text-navy-900 shadow-[var(--shadow-pop)] backdrop:bg-navy-950/70">
          <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
            <h3 id={`${type}-consent-title`} className="display text-2xl">{labels.consentLink}</h3>
            <button type="button" onClick={() => dialogRef.current?.close()} className="grid size-10 place-items-center rounded-full hover:bg-black/5" aria-label={labels.close}>
              <Icons.Close />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-6 py-5">{consentBody}</div>
          <div className="flex justify-end border-t border-line px-6 py-4">
            <button
              type="button"
              onClick={() => {
                setConsent(true);
                setErrors((x) => ({ ...x, consent: "" }));
                dialogRef.current?.close();
              }}
              className={buttonClass("primary", "md")}
            >
              {labels.consentAgree} <Icons.Check />
            </button>
          </div>
        </dialog>
      )}

      {TURNSTILE_KEY && step === steps - 1 && (
        <div>
          <div ref={captchaRef} />
          {errors.captcha && <p className="mt-1 text-sm font-bold text-red-500">{errors.captcha}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className={buttonClass(dark ? "outline" : "outline", "lg")}>
            <Icons.ArrowLeft /> {labels.back}
          </button>
        )}
        <button type="submit" disabled={state === "sending"} className={buttonClass("primary", "lg", "min-w-48")}>
          {state === "sending" ? labels.sending : step < steps - 1 ? labels.next : (submitLabel ?? labels.submit)} <Icons.ArrowRight />
        </button>
      </div>
    </form>
  );
}
