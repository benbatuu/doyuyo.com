import { notFound } from "next/navigation";
import { isPublishedLocale } from "@doyuyo/i18n";
import { app } from "@/lib/data";

/**
 * /bakim exists only while maintenance mode is on. The layout shows the maintenance screen
 * for every URL in that case, so this page itself renders nothing.
 */
export default async function MaintenanceRoute({ params }: PageProps<"/[locale]/bakim">) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  const maint = await app().manageSettings.getMaintenance();
  if (!maint.enabled) notFound();
  return null;
}
