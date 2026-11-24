import { and, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import type { FormRepository, FormType, Submission, SubmissionStatus } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { formSubmissions } from "../schema/index.ts";

type Row = typeof formSubmissions.$inferSelect;
const toSubmission = (r: Row): Submission => ({
  id: r.id,
  type: r.type as FormType,
  status: r.status as SubmissionStatus,
  data: r.data as Record<string, string>,
  notes: r.notes,
  locale: r.locale,
  pagePath: r.pagePath,
  pageTitle: r.pageTitle,
  referrer: r.referrer,
  utm: r.utm as Submission["utm"],
  ip: r.ip,
  userAgent: r.userAgent,
  device: r.device as Submission["device"],
  geo: r.geo as Submission["geo"],
  consentAt: r.consentAt,
  consentVersion: r.consentVersion ?? "",
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export class DrizzleFormRepository implements FormRepository {
  constructor(private readonly db: Db) {}

  async create({ type, data, context, consentAt }: Parameters<FormRepository["create"]>[0]) {
    const [row] = await this.db
      .insert(formSubmissions)
      .values({ type, data, consentAt, ...context })
      .returning({ id: formSubmissions.id });
    return { id: row!.id };
  }

  async list({ type, status, q, limit, offset }: Parameters<FormRepository["list"]>[0]) {
    const where = and(
      type ? eq(formSubmissions.type, type) : undefined,
      status ? eq(formSubmissions.status, status) : undefined,
      q ? or(ilike(sql`${formSubmissions.data}::text`, `%${q}%`), ilike(formSubmissions.pagePath, `%${q}%`)) : undefined,
    );
    const [rows, [total]] = await Promise.all([
      this.db.select().from(formSubmissions).where(where).orderBy(desc(formSubmissions.createdAt)).limit(limit).offset(offset),
      this.db.select({ n: count() }).from(formSubmissions).where(where),
    ]);
    return { items: rows.map(toSubmission), total: total?.n ?? 0 };
  }

  async get(id: number) {
    const [r] = await this.db.select().from(formSubmissions).where(eq(formSubmissions.id, id));
    return r ? toSubmission(r) : null;
  }

  async update(id: number, patch: { status?: SubmissionStatus; notes?: string }) {
    await this.db
      .update(formSubmissions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(formSubmissions.id, id));
  }

  async countsByType() {
    const rows = await this.db
      .select({ type: formSubmissions.type, status: formSubmissions.status, count: count() })
      .from(formSubmissions)
      .groupBy(formSubmissions.type, formSubmissions.status);
    return rows.map((r) => ({ type: r.type as FormType, status: r.status as SubmissionStatus, count: r.count }));
  }

  async recentFromIp(ip: string, minutes: number) {
    const [r] = await this.db
      .select({ n: count() })
      .from(formSubmissions)
      .where(and(eq(formSubmissions.ip, ip), gte(formSubmissions.createdAt, new Date(Date.now() - minutes * 60_000))));
    return r?.n ?? 0;
  }
}
