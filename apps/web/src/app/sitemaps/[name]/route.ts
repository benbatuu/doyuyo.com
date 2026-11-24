import { SITEMAP_GROUPS, sitemapFor, type SitemapName } from "@/seo/sitemap";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!(name in SITEMAP_GROUPS)) return new Response("Not found", { status: 404 });
  return new Response(await sitemapFor(name as SitemapName), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
