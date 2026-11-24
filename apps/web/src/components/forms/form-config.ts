import "server-only";
import { getTranslations } from "next-intl/server";
import { FORM_FIELDS, type FormType } from "@doyuyo/core";
import type { Locale } from "@doyuyo/i18n";
import type { FieldDef, FormLabels } from "./lead-form";

/** Presentation for each stored field (type, width, step). Keys and rules come from the domain (FORM_FIELDS). */
const UI: Record<string, Partial<FieldDef>> = {
  name: { type: "text", half: true, autoComplete: "given-name" },
  surname: { type: "text", half: true, autoComplete: "family-name" },
  phone: { type: "tel", half: true, autoComplete: "tel", placeholder: "05__ ___ __ __" },
  email: { type: "email", half: true, autoComplete: "email" },
  subject: { type: "select" },
  department: { type: "select", half: true },
  city: { type: "text", half: true, autoComplete: "address-level2" },
  country: { type: "select" },
  province: { type: "text", half: true },
  district: { type: "text", half: true },
  storeSize: { type: "number", half: true, placeholder: "m²" },
  budget: { type: "text", placeholder: "TL" },
  job: { type: "text" },
};

export async function formFields(type: FormType, locale: Locale): Promise<FieldDef[]> {
  const t = await getTranslations({ locale, namespace: "forms" });
  return FORM_FIELDS[type].map((f) => ({
    name: f.name,
    label: t(`f.${f.name}`),
    required: f.required,
    type: "text",
    ...UI[f.name],
    options: f.options?.map((o) => ({ value: o, label: t(`o.${f.name}.${o}`) })),
    step: 0,
  })) as FieldDef[];
}

export async function formLabels(locale: Locale): Promise<FormLabels> {
  const t = await getTranslations({ locale, namespace: "forms.ui" });
  const keys = ["submit", "sending", "next", "back", "stepOf", "required", "invalid", "consent", "consentLink", "consentRequired", "consentAgree", "close", "successTitle", "successText", "error", "rateLimited", "again"] as const;
  // raw: placeholders like {current} are filled in by the client component.
  return Object.fromEntries(keys.map((k) => [k, t.raw(k) as string])) as unknown as FormLabels;
}

