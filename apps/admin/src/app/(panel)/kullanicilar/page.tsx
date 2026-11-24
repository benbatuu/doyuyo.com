import { container } from "@doyuyo/infrastructure";
import { requireAccess } from "@/lib/access";
import { UsersView } from "@/components/users/users-view";

export default async function UsersPage() {
  const actor = await requireAccess("users");
  const c = container().manageUsers;
  const [users, matrix] = await Promise.all([c.list(), c.matrix()]);
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">Sistem</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Kullanıcılar ve roller</h1>
        <p className="mt-1 text-muted-foreground">Panele kimlerin girdiğini, hangi rolde olduğunu ve her rolün hangi alanlara erişeceğini buradan yönetirsin.</p>
      </header>
      <UsersView users={users} matrix={matrix} actorEmail={actor.email} actorRole={actor.role} />
    </div>
  );
}
