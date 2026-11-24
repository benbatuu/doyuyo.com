import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/**
 * Share card (1200×630) for pages that have no photo of their own: brand colours, the page title, the brand slogan.
 * Fonts: Nunito Sans ExtraBold (latin + latin-ext for Turkish letters), bundled next to this file.
 */
export const runtime = "nodejs";

const font = async (name: string) => {
  const b = await readFile(join(process.cwd(), "public/fonts", name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

export async function GET(req: NextRequest) {
  const title = (req.nextUrl.searchParams.get("title") ?? "Doyuyo!").slice(0, 90);
  const kicker = (req.nextUrl.searchParams.get("kicker") ?? "").slice(0, 40);
  const [latin, ext] = await Promise.all([font("nunito-sans-latin-800-normal.woff"), font("nunito-sans-latin-ext-800-normal.woff")]);
  const size = title.length > 60 ? 64 : title.length > 36 ? 84 : 104;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#01243C", padding: 72, fontFamily: "Nunito Sans", color: "#fff", position: "relative" }}>
        <div style={{ position: "absolute", right: -140, top: -140, width: 520, height: 520, borderRadius: 520, background: "#E63D30", opacity: 0.9, display: "flex" }} />
        <div style={{ position: "absolute", right: 120, bottom: -120, width: 300, height: 300, borderRadius: 300, background: "#F9A11B", display: "flex" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
          <div style={{ display: "flex", background: "#E63D30", padding: "8px 22px", borderRadius: 999 }}>DOYUYO!</div>
          {kicker && <div style={{ display: "flex", color: "#B6DAEF", fontSize: 30 }}>{kicker}</div>}
        </div>
        <div style={{ display: "flex", fontSize: size, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, maxWidth: 860 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#F9A11B" }}>Doyuyo Anlatılmaz Yenir!</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Nunito Sans", data: ext, weight: 800, style: "normal" },
        { name: "Nunito Sans", data: latin, weight: 800, style: "normal" },
      ],
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
  );
}
