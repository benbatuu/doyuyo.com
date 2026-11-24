import { validateForm, type FieldErrors, type FormType, type Submission, type SubmissionContext, type SubmissionStatus } from "../../domain/form.ts";

export interface FormRepository {
  create(input: { type: FormType; data: Record<string, string>; context: SubmissionContext; consentAt: Date }): Promise<{ id: number }>;
  list(filter: { type?: FormType; status?: SubmissionStatus; q?: string; limit: number; offset: number }): Promise<{ items: Submission[]; total: number }>;
  get(id: number): Promise<Submission | null>;
  update(id: number, patch: { status?: SubmissionStatus; notes?: string }): Promise<void>;
  countsByType(): Promise<{ type: FormType; status: SubmissionStatus; count: number }[]>;
  /** Submissions from this IP in the last `minutes` (abuse limit). */
  recentFromIp(ip: string, minutes: number): Promise<number>;
}

/** Tells the team about a new submission (e-mail, chat…). Failures never block the visitor. */
export interface FormNotifier {
  notify(event: { id: number; type: FormType; data: Record<string, string>; context: SubmissionContext }): Promise<void>;
}

export type SubmitResult = { ok: true; id: number } | { ok: false; reason: "invalid"; errors: FieldErrors } | { ok: false; reason: "consent" | "rate_limited" | "spam" };

/** Visitor submits a form: consent required, honeypot + per-IP rate limit, then stored for the admin inbox. */
export class SubmitForm {
  constructor(
    private readonly forms: FormRepository,
    private readonly maxPerHour = 8,
    private readonly notifier?: FormNotifier,
  ) {}

  async execute(type: FormType, input: Record<string, unknown>, context: SubmissionContext): Promise<SubmitResult> {
    if (typeof input.website === "string" && input.website.trim()) return { ok: false, reason: "spam" }; // honeypot
    if (input.consent !== true) return { ok: false, reason: "consent" };
    if (context.ip && (await this.forms.recentFromIp(context.ip, 60)) >= this.maxPerHour) return { ok: false, reason: "rate_limited" };
    const v = validateForm(type, input);
    if (!v.ok) return { ok: false, reason: "invalid", errors: v.errors };
    const { id } = await this.forms.create({ type, data: v.data, context, consentAt: new Date() });
    if (this.notifier) {
      // Wait briefly so the mail leaves before the request ends, but never fail or stall the visitor.
      await Promise.race([this.notifier.notify({ id, type, data: v.data, context }).catch((e) => console.error("form notify failed", e)), new Promise((r) => setTimeout(r, 4000))]);
    }
    return { ok: true, id };
  }
}

export class ListSubmissions {
  constructor(private readonly forms: FormRepository) {}
  execute(filter: Parameters<FormRepository["list"]>[0]) {
    return this.forms.list(filter);
  }
  counts() {
    return this.forms.countsByType();
  }
}

export class GetSubmission {
  constructor(private readonly forms: FormRepository) {}
  execute(id: number) {
    return this.forms.get(id);
  }
}

export class UpdateSubmission {
  constructor(private readonly forms: FormRepository) {}
  execute(id: number, patch: { status?: SubmissionStatus; notes?: string }) {
    return this.forms.update(id, { ...patch, notes: patch.notes?.slice(0, 5000) });
  }
}
