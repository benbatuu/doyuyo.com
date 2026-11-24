import { container } from "@doyuyo/infrastructure";

export const dynamic = "force-dynamic";

/** Liveness + database check for the host / load balancer. */
export async function GET() {
  try {
    await container().ping();
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
