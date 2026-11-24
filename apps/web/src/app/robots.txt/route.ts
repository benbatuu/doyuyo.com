import { IS_PRODUCTION_SITE, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Search engines, AI search/answer bots and AI crawlers are all welcome (client decision). */
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "CCBot",
  "cohere-ai",
  "Amazonbot",
  "Meta-ExternalAgent",
  "DuckAssistBot",
  "MistralAI-User",
  "YouBot",
  "Diffbot",
];

export function GET() {
  const body = IS_PRODUCTION_SITE
    ? [
        "# Doyuyo! — https://doyuyo.com",
        "# Machine-readable summary for AI assistants: /llms.txt and /llms-full.txt",
        "",
        "User-agent: *",
        "Allow: /",
        "Disallow: /api/",
        "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
        "",
        "# AI search, assistants and crawlers",
        ...AI_BOTS.map((b) => `User-agent: ${b}`),
        "Allow: /",
        "Disallow: /api/",
        "",
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        "",
      ].join("\n")
    : // Local / staging hosts must never be indexed.
      ["User-agent: *", "Disallow: /", ""].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
