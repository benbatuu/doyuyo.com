import { container } from "@doyuyo/infrastructure";
import { isFormType } from "@doyuyo/core";
import { currentUser } from "@/lib/session";
import { FIELD_LABEL, STATUS_LABEL, TYPE_LABEL, VALUE_LABEL } from "@/lib/labels";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // CSV + spreadsheet formula injection guard
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  if (!(await currentUser())) return new Response("Unauthorized", { status: 401 });
  const t = new URL(req.url).searchParams.get("type") ?? "";
  const type = isFormType(t) ? t : undefined;
  const { items } = await container().listSubmissions.execute({ type, limit: 10_000, offset: 0 });
  const keys = [...new Set(items.flatMap((s) => Object.keys(s.data)))];
  const head = ["ID", "Tarih", "Form", "Durum", ...keys.map((k) => FIELD_LABEL[k] ?? k), "Sayfa", "Referrer", "UTM", "Cihaz", "OS", "Tarayıcı", "Konum", "Saat dilimi", "IP", "Not"];
  const rows = items.map((s) => [
    s.id,
    s.createdAt.toISOString(),
    TYPE_LABEL[s.type],
    STATUS_LABEL[s.status],
    ...keys.map((k) => VALUE_LABEL[s.data[k] ?? ""] ?? s.data[k] ?? ""),
    s.pagePath,
    s.referrer,
    s.utm ? Object.entries(s.utm).map(([k, v]) => `${k}=${v}`).join(" ") : "",
    s.device?.type,
    s.device?.os,
    s.device?.browser,
    [s.geo?.city, s.geo?.region, s.geo?.country].filter(Boolean).join(", "),
    s.geo?.timezone,
    s.ip,
    s.notes,
  ]);
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="doyuyo-formlar-${type ?? "tum"}.csv"`, "cache-control": "no-store" },
  });
}
