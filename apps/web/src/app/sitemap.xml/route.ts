import { sitemapIndex } from "@/seo/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await sitemapIndex(), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
