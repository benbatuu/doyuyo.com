import { container } from "@doyuyo/infrastructure";
import { requireAccess } from "@/lib/access";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const ctx = await requireAccess("settings");
  const c = container().manageSettings;
  const [contact, maintenance] = await Promise.all([c.getContact(), c.getMaintenance()]);
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">Sistem</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Ayarlar</h1>
        <p className="mt-1 text-muted-foreground">Bu bilgiler sitenin iletişim sayfasında, alt bilgide, bakım ekranında ve arama motorlarına giden veride kullanılır.</p>
      </header>
      <SettingsView contact={contact} maintenanceEnabled={maintenance.enabled} canMaintenance={ctx.perms.maintenance} />
    </div>
  );
}
