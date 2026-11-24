import { llmsTxt } from "@/seo/llms";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await llmsTxt(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
