import { requireAccess } from "@/lib/access";
import { container } from "@doyuyo/infrastructure";
import { BranchView } from "@/components/branches/branch-view";

export default async function BranchesPage() {
  await requireAccess("branches");
  const c = container().manageBranches;
  const [cities, branches] = await Promise.all([c.cities(), c.branches()]);
  const live = branches.filter((b) => b.status === "open").length;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Restoran</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Şubeler</h1>
        <p className="mt-1 text-muted-foreground">
          {branches.length} şube · {cities.filter((x) => x.branchCount).length} şehir · {live} tanesi sitede yayında.
        </p>
      </header>
      <BranchView cities={cities} branches={branches} />
    </div>
  );
}
