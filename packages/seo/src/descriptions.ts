import type { BranchSummary, OpeningHours } from "@doyuyo/core";
import { plain, shortBranchName, truncate } from "./text.ts";

export interface DescLabels {
  hours: string; // "Çalışma saatleri" / "Opening hours"
  branchOf: string; // "Doyuyo! {name} şubesi" / "Doyuyo! {name} branch": with {name}
  cityBranches: string; // "{city} şehrindeki {count} Doyuyo! şubesi ..." with {city} {count}
}

const hoursText = (h: OpeningHours[]) => h.map((x) => `${x.day} ${x.time}`).join(", ");

/** Meta description for a branch whose old page had none: name, address, hours (all real fields). */
export function branchDescription(b: Pick<BranchSummary, "name" | "address" | "hours">, l: DescLabels): string {
  const head = l.branchOf.replace("{name}", shortBranchName(b.name));
  return truncate(`${head}: ${plain(b.address)}. ${l.hours}: ${hoursText(b.hours)}.`, 158);
}

export function cityDescription(city: string, branches: { name: string }[], l: DescLabels): string {
  const names = branches.slice(0, 3).map((b) => shortBranchName(b.name)).join(", ");
  return truncate(`${l.cityBranches.replace("{city}", city).replace("{count}", String(branches.length))} ${names}${branches.length > 3 ? "…" : ""}`, 158);
}

export { truncate };
