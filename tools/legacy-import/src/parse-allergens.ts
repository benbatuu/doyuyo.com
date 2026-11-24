/**
 * Allergen + nutrition PDF -> output/json/allergens.json
 *
 * - Nutrition table is real text: parsed line by line.
 * - Allergen checkmarks are drawings, not text. We locate each row (product name) and
 *   column (allergen label) from the PDF text positions, render the page, and test
 *   the cell center for the orange checkmark color. Deterministic, no guessing.
 * The PDF font maps "i" to U+001F; fixed on read.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";
import { JSON_DIR, MEDIA, writeJson } from "./lib.ts";

const REL = "files/Alerjenler-ve-Besin-Icerikleri-Tablosu.pdf";
const SCALE = 3;
const fix = (s: string) => s.replace(/\u001f/g, "i").replace(/\s+/g, " ").trim();

const ALLERGENS = [
  "Gluten",
  "Yumurta",
  "Balık",
  "Yer Fıstığı",
  "Kabuklular",
  "Sert Kabuklu Meyveler",
  "Soya",
  "Süt",
  "Kereviz",
  "Hardal",
  "Susam",
  "Sülfitler",
  "Acı Bakla",
  "Yumuşakçalar",
] as const;

interface TextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

async function textItems(pdf: Awaited<ReturnType<typeof getDocumentProxy>>, pageNo: number) {
  const page = await pdf.getPage(pageNo);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items: TextItem[] = (tc.items as { str: string; transform: number[]; width: number; height: number }[])
    .map((it) => ({ str: fix(it.str), x: it.transform[4]!, y: vp.height - it.transform[5]!, w: it.width, h: it.height }))
    .filter((i) => i.str);
  return { items, width: vp.width, height: vp.height };
}

async function allergenMatrix(buf: Uint8Array, pdf: Awaited<ReturnType<typeof getDocumentProxy>>, pageNo: number) {
  const { items } = await textItems(pdf, pageNo);

  // Column centers: first occurrence of each allergen short label in the header band.
  const headerTop = Math.min(...items.filter((i) => i.str === "Gluten").map((i) => i.y));
  const cols = ALLERGENS.map((name) => {
    const first = name.split(" ")[0]!;
    const it = items
      .filter((i) => Math.abs(i.y - headerTop) < 4 && (i.str === name || i.str.startsWith(first)))
      .sort((a, b) => a.x - b.x)[0];
    return { name, x: it ? it.x + it.w / 2 : NaN };
  });
  const missing = cols.filter((c) => Number.isNaN(c.x)).map((c) => c.name);
  if (missing.length) throw new Error(`allergen columns not found: ${missing.join(", ")}`);
  const firstColX = Math.min(...cols.map((c) => c.x));

  // Rows: text left of the grid, below the header, all-caps product names. Section bars are orange (skipped below).
  const rowItems = items
    .filter((i) => i.y > headerTop + 20 && i.x + i.w < firstColX - 10 && /[A-ZÇĞİÖŞÜ]{2}/.test(i.str))
    .sort((a, b) => a.y - b.y);
  // merge fragments on the same baseline ("GAZOZ" + "( TURUNÇGİL AROMALI) - 7UP ...")
  const rows: { name: string; y: number; x: number }[] = [];
  for (const it of rowItems) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - it.y) < 3) last.name = fix(`${last.name} ${it.str}`);
    else rows.push({ name: it.str, y: it.y, x: it.x });
  }

  // Render and sample pixels.
  const png = await renderPageAsImage(buf.slice(), pageNo, { canvasImport: () => import("@napi-rs/canvas"), scale: SCALE });
  const img = await loadImage(Buffer.from(png));
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const isOrange = (r: number, g: number, b: number) => r > 200 && g > 110 && g < 210 && b < 110;
  const orangeShare = (cx: number, cy: number, half: number) => {
    const d = ctx.getImageData(Math.round(cx - half), Math.round(cy - half), half * 2, half * 2).data;
    let n = 0;
    for (let p = 0; p < d.length; p += 4) if (isOrange(d[p]!, d[p + 1]!, d[p + 2]!)) n++;
    return n / (d.length / 4);
  };

  const result: { name: string; section: string; allergens: string[] }[] = [];
  let section = "";
  for (const row of rows) {
    // text baseline -> visual center of the row is slightly above the baseline
    const cy = (row.y - 3) * SCALE;
    // Section header bars are filled orange behind the text.
    if (orangeShare((row.x - 4) * SCALE, cy, 2) > 0.5) {
      section = row.name;
      continue;
    }
    const allergens = cols.filter((c) => orangeShare(c.x * SCALE, cy, 6 * (SCALE / 2)) > 0.08).map((c) => c.name);
    result.push({ name: row.name, section, allergens });
  }
  return { columns: cols.map((c) => c.name), rows: result };
}

function nutrition(pages: string[]) {
  const rows: { section: string; name: string | null; kj: number; kcal: number; fat: number; protein: number; carbs: number; note?: string }[] = [];
  const num = (s: string) => Number(s.replace(",", "."));
  for (const p of pages) {
    let section = "";
    const lines = p.split("\n").map(fix).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^(.*?)\s*([\d.,]+)\s*\/\s*([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)$/);
      if (m) {
        rows.push({ section, name: m[1] || null, kj: num(m[2]!), kcal: num(m[3]!), fat: num(m[4]!), protein: num(m[5]!), carbs: num(m[6]!) });
      } else if (/^[A-ZÇĞİÖŞÜ &]+$/.test(line) && !/TABLOSU|DEGERLERI/.test(line)) section = line;
    }
  }
  // In the SOSLAR block the first row has no name; the lone label in that block is "KETÇAP".
  for (const r of rows) {
    if (!r.name && r.section === "SOSLAR") {
      r.name = "KETÇAP";
      r.note = "PDF'te satır adı ayrı metin olarak duruyor; bloktaki tek isimsiz satır KETÇAP ile eşlendi. Elle doğrulanmalı.";
    }
  }
  return rows;
}

async function main() {
  const buf = new Uint8Array(await readFile(join(MEDIA, REL)));
  const pdf = await getDocumentProxy(buf.slice());
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = (text as string[]).map((p) => p.replace(/\u001f/g, "i"));

  const allergenPage = pages.findIndex((p) => p.includes("Alerjen Tablosu")) + 1;
  const matrix = await allergenMatrix(buf, pdf, allergenPage);
  const nut = nutrition(pages);
  // Notes start with "*", "Not:" or "Alerji ve Alerjen"; the PDF wraps them onto following lines.
  const lines = pages.join("\n").split("\n").map(fix).filter(Boolean);
  const notes: string[] = [];
  const isStart = (l: string) => /^(\*|Not:|Alerji ve Alerjen)/.test(l);
  for (let i = 0; i < lines.length; i++) {
    if (!isStart(lines[i]!)) continue;
    let note = lines[i]!;
    while (lines[i + 1] && !isStart(lines[i + 1]!) && /[a-zçğıöşü,;]$/i.test(note) && /^[a-zçğıöşü]/.test(lines[i + 1]!)) note += " " + lines[++i];
    notes.push(note);
  }

  await writeJson(join(JSON_DIR, "allergens.json"), {
    source: `https://doyuyo.com/${REL}`,
    pages: totalPages,
    allergenColumns: matrix.columns,
    allergens: matrix.rows,
    nutrition: nut,
    notes,
    rawText: pages,
  });
  console.log({ allergenRows: matrix.rows.length, nutritionRows: nut.length });
  for (const r of matrix.rows) console.log(`${r.section.padEnd(16).slice(0, 16)} ${r.name.padEnd(44).slice(0, 44)} ${r.allergens.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
