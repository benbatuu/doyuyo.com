import Link from "next/link";
import { getTranslations } from "next-intl/server";
import clsx from "clsx";
import type { AllergenTable, ProductAllergenInfo } from "@doyuyo/core";
import { allergenLabel, type Locale } from "@doyuyo/i18n";
import { Icons } from "@doyuyo/ui";

/**
 * Allergens + nutrition on the product page, straight from the brand's PDF table
 * (matched per product at import time). Combos list their components one by one.
 */
export async function ProductAllergens({ info, table, locale, allergensPath }: { info: ProductAllergenInfo | null; table: AllergenTable | null; locale: Locale; allergensPath: string }) {
  if (!table) return null;
  const t = await getTranslations({ locale, namespace: "allergens" });
  const num = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-GB", { maximumFractionDigits: 2 });
  const has = new Set(info?.allergens ?? []);
  const known = info && info.kind !== "none";
  const notes = table.notes.filter((n) => n.startsWith("*"));

  return (
    <section aria-labelledby="allergens-title" className="rounded-[var(--radius-card)] border border-line bg-white p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="allergens-title" className="display text-2xl md:text-3xl">
          {t("onProduct")}
        </h2>
        <div className="flex gap-3 text-sm font-extrabold">
          <Link href={allergensPath} className="text-red-600 underline underline-offset-4">
            {t("fullTable")}
          </Link>
          {table.pdf && (
            <a href={table.pdf.src} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-navy-900 underline underline-offset-4">
              <Icons.Download /> PDF
            </a>
          )}
        </div>
      </div>

      {!known ? (
        <p className="mt-4 rounded-2xl bg-cream-50 p-4 text-sm font-bold text-muted">{t("noRow")}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">{info!.kind === "combo" ? t("comboIntro") : t("singleIntro")}</p>
          <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {table.columns.map((c) => {
              const on = has.has(c);
              return (
                <li
                  key={c}
                  className={clsx(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold",
                    on ? "bg-amber-400 text-navy-900" : "bg-paper text-muted/70 line-through decoration-muted/30",
                  )}
                >
                  <span className={clsx("grid size-5 shrink-0 place-items-center rounded-full text-xs", on ? "bg-navy-900 text-white" : "bg-line")}>
                    {on ? <Icons.Check /> : null}
                  </span>
                  {allergenLabel(c, locale)}
                  <span className="sr-only">{on ? t("contains") : t("notContains")}</span>
                </li>
              );
            })}
          </ul>

          {info!.nutrition && (
            <div className="mt-6">
              <p className="eyebrow mb-2 text-muted">{t("per100")}</p>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  [t("kcal"), `${num.format(info!.nutrition.kcal)}`],
                  [t("fat"), num.format(info!.nutrition.fat)],
                  [t("protein"), num.format(info!.nutrition.protein)],
                  [t("carbs"), num.format(info!.nutrition.carbs)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-navy-900 p-4 text-white">
                    <dd className="display text-3xl text-amber-400">{v}</dd>
                    <dt className="mt-1 text-xs font-bold text-white/70">{k}</dt>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {info!.kind === "combo" && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="eyebrow mb-2 text-left text-muted">{t("inThisMenu")}</caption>
                <tbody>
                  {info!.components.map((c, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <th scope="row" className="py-2 pr-3 font-bold capitalize">
                        {c.quantity ? `${c.quantity} × ` : ""}
                        {c.label}
                      </th>
                      <td className="py-2 text-muted">{c.allergenRow ? (c.allergens.length ? c.allergens.map((a) => allergenLabel(a, locale)).join(", ") : t("none")) : t("notInTable")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {notes.length > 0 && (
        <div className="mt-5 space-y-1 text-xs text-muted">
          {notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      )}
    </section>
  );
}
