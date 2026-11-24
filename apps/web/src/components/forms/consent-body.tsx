import { app } from "@/lib/data";
import { ContentNodes } from "@/components/blocks/content-nodes";
import type { Locale } from "@doyuyo/i18n";

/** Privacy notice text (KVKK page) for the consent dialog. Rendered on the server, shown in a dialog. */
export async function ConsentBody({ locale }: { locale: Locale }) {
  const page = await app().getStaticPage.byKey("legal-kvkk", locale);
  if (!page) return null;
  return <ContentNodes nodes={page.sections.flatMap((s) => s.nodes)} className="text-sm" />;
}
