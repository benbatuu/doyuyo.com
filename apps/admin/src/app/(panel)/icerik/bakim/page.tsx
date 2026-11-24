import { container } from "@doyuyo/infrastructure";
import { requireAccess } from "@/lib/access";
import { MaintenanceView } from "@/components/maintenance/maintenance-view";
import { PagesHeader } from "@/components/pages/pages-header";

export default async function MaintenancePage() {
  await requireAccess("maintenance");
  const maintenance = await container().manageSettings.getMaintenance();
  return (
    <div className="space-y-6">
      <PagesHeader title="Bakım sayfası" subtitle="Açıkken tüm site ziyaretçilere bu sayfayı gösterir. Kapalıyken /bakim adresi bulunamaz." />
      <MaintenanceView initial={maintenance} />
    </div>
  );
}
