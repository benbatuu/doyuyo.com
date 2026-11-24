import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  transpilePackages: ["@doyuyo/core", "@doyuyo/i18n", "@doyuyo/infrastructure", "@doyuyo/ui", "@doyuyo/seo"],
  serverExternalPackages: ["postgres"],
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 80],
    deviceSizes: [390, 640, 828, 1080, 1280, 1600, 1920],
  },
  poweredByHeader: false,
  compress: true,
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ];
    const immutable = "public, max-age=31536000, immutable";
    return [
      { source: "/:path*", headers: security },
      // SEO-named photos never change under the same name.
      { source: "/img/:path*", headers: [{ key: "Cache-Control", value: immutable }] },
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
      { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }] },
      { source: "/vendor/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
  // Old site's downloadable files (allergen PDF) keep working.
  async redirects() {
    return [
      // Browsers ask for /favicon.ico by default.
      { source: "/favicon.ico", destination: "/icons/favicon-32x32.png", permanent: false },
      // The two PDFs people actually link to move to clean names.
      { source: "/files/Alerjenler-ve-Besin-Icerikleri-Tablosu.pdf", destination: "/docs/doyuyo-alerjen-ve-besin-degerleri-tablosu.pdf", permanent: true },
      { source: "/storage/146/PARDO_FOOD_KATALOG_2023_FIN_KUCUK.pdf", destination: "/docs/pardofood-kurumsal-katalog-2023.pdf", permanent: true },
      { source: "/files/:path*", destination: "/media/legacy/files/:path*", permanent: true },
      // Old direct file links (e.g. the PardoFood catalog PDF) keep working.
      { source: "/storage/:path*", destination: "/media/legacy/storage/:path*", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
