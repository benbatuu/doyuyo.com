import type { OpeningHours } from "@doyuyo/core";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const NAMES: [RegExp, number][] = [
  [/^(pazartesi|monday)/, 0],
  [/^(salı|sali|tuesday)/, 1],
  [/^(çarşamba|carsamba|wednesday)/, 2],
  [/^(perşembe|persembe|thursday)/, 3],
  [/^(cuma|friday)/, 4],
  [/^(cumartesi|saturday)/, 5],
  [/^(pazar|sunday)/, 6],
];
const idx = (label: string) => {
  const l = label.trim().toLocaleLowerCase("tr");
  // "cumartesi" must win over "cuma"
  if (l.startsWith("cumartesi")) return 5;
  return NAMES.find(([re]) => re.test(l))?.[1] ?? -1;
};
const pad = (h: string, m: string) => `${h.padStart(2, "0")}:${m}`;

/** schema.org openingHoursSpecification from the published rows ("Tüm Hafta 10:00 - 22:00", "Cuma – Pazar 10:00 - 01:00"). Rows it cannot read are skipped, never guessed. */
export function openingHoursSpec(hours: OpeningHours[]) {
  const out: Record<string, unknown>[] = [];
  for (const h of hours) {
    const t = h.time.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (!t) continue;
    const label = h.day.toLocaleLowerCase("tr");
    let days: number[] = [];
    if (/tüm hafta|all week|every day|her gün/.test(label)) days = [0, 1, 2, 3, 4, 5, 6];
    else {
      const parts = h.day.split(/\s*[–—-]\s*/);
      if (parts.length === 2) {
        const a = idx(parts[0]!);
        const b = idx(parts[1]!);
        if (a >= 0 && b >= 0) {
          let i = a;
          for (let n = 0; n < 7; n++) {
            days.push(i);
            if (i === b) break;
            i = (i + 1) % 7;
          }
        }
      } else if (idx(h.day) >= 0) days = [idx(h.day)];
    }
    days = [...new Set(days.filter((d) => d >= 0))];
    if (!days.length) continue;
    out.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days.map((d) => `https://schema.org/${DAYS[d]}`),
      opens: pad(t[1]!, t[2]!),
      closes: pad(t[3]!, t[4]!),
    });
  }
  return out;
}
