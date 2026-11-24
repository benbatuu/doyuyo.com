import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  transpilePackages: ["@doyuyo/core", "@doyuyo/i18n", "@doyuyo/infrastructure", "@doyuyo/ui"],
  serverExternalPackages: ["postgres"],
  poweredByHeader: false,
};
export default nextConfig;
