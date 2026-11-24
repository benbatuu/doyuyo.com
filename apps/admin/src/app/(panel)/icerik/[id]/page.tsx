import { notFound } from "next/navigation";
import { container } from "@doyuyo/infrastructure";
import { PUBLISHED_LOCALES } from "@doyuyo/i18n";
import { fmtDate } from "@/lib/labels";
import { PageEditor } from "./page-editor";

import { SITE_URL as SITE } from "@/lib/media";

export default async function EditPage({ params }: PageProps<"/icerik/[id]">) {
  const { id } = await params;
  const page = await container().managePages.get(Number(id));
  if (!page) notFound();
  return (
    <PageEditor
      page={{ ...page, updatedAt: fmtDate(page.updatedAt) }}
      locales={[...PUBLISHED_LOCALES]}
      site={SITE}
      back={page.key.startsWith("legal-") ? { href: "/yasal", label: "Yasal metinler" } : { href: "/icerik", label: "Sayfalar" }}
    />
  );
}
