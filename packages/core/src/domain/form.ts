/** Lead / message forms and what the admin inbox stores about each submission. */

export const FORM_TYPES = ["contact", "careers", "investor"] as const;
export type FormType = (typeof FORM_TYPES)[number];
export const isFormType = (v: string): v is FormType => (FORM_TYPES as readonly string[]).includes(v);

export const SUBMISSION_STATUSES = ["new", "in_progress", "done", "spam"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface FieldSpec {
  name: string;
  required: boolean;
  kind: "text" | "email" | "phone" | "longtext" | "choice" | "number";
  max?: number;
  options?: readonly string[];
}

/**
 * Field rules per form. Labels live in the UI (translated); these are the stored keys.
 * Contact/careers/investor mirror the old site's forms (same fields), investor adds model and timing.
 */
export const FORM_FIELDS: Record<FormType, FieldSpec[]> = {
  contact: [
    { name: "name", required: true, kind: "text", max: 80 },
    { name: "surname", required: true, kind: "text", max: 80 },
    { name: "phone", required: true, kind: "phone" },
    { name: "email", required: true, kind: "email" },
    { name: "subject", required: true, kind: "choice", options: ["franchise", "job", "complaint", "other"] },
    { name: "message", required: true, kind: "longtext", max: 3000 },
  ],
  careers: [
    { name: "name", required: true, kind: "text", max: 80 },
    { name: "surname", required: true, kind: "text", max: 80 },
    { name: "phone", required: true, kind: "phone" },
    { name: "email", required: true, kind: "email" },
    { name: "department", required: true, kind: "choice", options: ["general"] },
    { name: "city", required: false, kind: "text", max: 80 },
    { name: "message", required: false, kind: "longtext", max: 3000 },
  ],
  investor: [
    { name: "name", required: true, kind: "text", max: 80 },
    { name: "surname", required: true, kind: "text", max: 80 },
    { name: "phone", required: true, kind: "phone" },
    { name: "email", required: true, kind: "email" },
    { name: "country", required: false, kind: "choice", options: ["turkiye"] },
    { name: "province", required: false, kind: "text", max: 80 },
    { name: "district", required: false, kind: "text", max: 80 },
    { name: "job", required: false, kind: "text", max: 120 },
    { name: "storeSize", required: false, kind: "number" },
    { name: "budget", required: false, kind: "text", max: 60 },
  ],
};

export interface SubmissionContext {
  locale: string;
  pagePath: string;
  pageTitle: string | null;
  referrer: string | null;
  utm: Record<string, string> | null;
  ip: string | null;
  userAgent: string | null;
  device: { type: string; os: string | null; browser: string | null; screen: string | null; language: string | null } | null;
  geo: { country: string | null; region: string | null; city: string | null; timezone: string | null; source: string } | null;
  consentVersion: string;
}

export interface Submission extends SubmissionContext {
  id: number;
  type: FormType;
  status: SubmissionStatus;
  data: Record<string, string>;
  notes: string;
  consentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FieldErrors = Record<string, "required" | "invalid" | "too_long">;

/** Pure validation; returns cleaned values or per-field errors. */
export function validateForm(type: FormType, input: Record<string, unknown>): { ok: true; data: Record<string, string> } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const data: Record<string, string> = {};
  for (const f of FORM_FIELDS[type]) {
    const raw = input[f.name];
    const v = typeof raw === "string" ? raw.trim() : typeof raw === "number" ? String(raw) : "";
    if (!v) {
      if (f.required) errors[f.name] = "required";
      continue;
    }
    if (f.max && v.length > f.max) errors[f.name] = "too_long";
    else if (f.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) errors[f.name] = "invalid";
    else if (f.kind === "phone" && v.replace(/\D/g, "").length < 10) errors[f.name] = "invalid";
    else if (f.kind === "number" && !/^\d{1,6}$/.test(v)) errors[f.name] = "invalid";
    else if (f.kind === "choice" && f.options && !f.options.includes(v)) errors[f.name] = "invalid";
    else data[f.name] = v;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
