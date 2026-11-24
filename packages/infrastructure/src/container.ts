/**
 * Composition root: wires repositories (adapters) into use cases.
 * Apps import use cases from here and never touch Drizzle directly.
 */
import {
  GetAllergenTable,
  GetBranch,
  GetCategory,
  GetCity,
  GetHome,
  GetMenu,
  GetProduct,
  GetSiteSettings,
  GetStaticPage,
  GetSubmission,
  ManageBranches,
  ManageCatalog,
  ManageMedia,
  ManagePages,
  ManageSeo,
  ManageSiteTexts,
  ManageUsers,
  ManageSettings,
  ListBranches,
  ListSubmissions,
  ResolvePath,
  SubmitForm,
  UpdateSubmission,
} from "@doyuyo/core";
import { DrizzleFormRepository } from "./db/repositories/form.repository.ts";
import { ResendNotifier } from "./notifier/resend-notifier.ts";
import { sql } from "drizzle-orm";
import { getDb } from "./db/client.ts";
import { DrizzleBranchRepository } from "./db/repositories/branch.repository.ts";
import { DrizzleCatalogRepository } from "./db/repositories/catalog.repository.ts";
import { DrizzlePageRepository, DrizzleSettingsRepository } from "./db/repositories/page.repository.ts";
import { DrizzleBranchAdminRepository } from "./db/repositories/branch-admin.repository.ts";
import { DrizzleCatalogAdminRepository } from "./db/repositories/catalog-admin.repository.ts";
import { DrizzleMediaAdminRepository } from "./db/repositories/media-admin.repository.ts";
import { DrizzlePageAdminRepository } from "./db/repositories/page-admin.repository.ts";
import { DrizzleRouteRepository } from "./db/repositories/route.repository.ts";
import { DrizzleSeoAdminRepository } from "./db/repositories/seo-admin.repository.ts";
import { DrizzleSiteAdminRepository } from "./db/repositories/site-admin.repository.ts";
import { DrizzleAdminUserRepository } from "./db/repositories/admin-user.repository.ts";
import { DrizzleSettingsKvRepository } from "./db/repositories/settings-kv.repository.ts";
import { ScryptPasswordHasher } from "./security/password-hasher.ts";

function build() {
  const db = getDb();
  const routes = new DrizzleRouteRepository(db);
  const catalog = new DrizzleCatalogRepository(db);
  const branches = new DrizzleBranchRepository(db);
  const pages = new DrizzlePageRepository(db);
  const settings = new DrizzleSettingsRepository(db);
  const forms = new DrizzleFormRepository(db);
  const to = (process.env.FORM_NOTIFY_TO ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const notifier = process.env.RESEND_API_KEY && to.length ? new ResendNotifier(process.env.RESEND_API_KEY, to, process.env.FORM_NOTIFY_FROM ?? "Doyuyo Form <forms@doyuyo.com>", process.env.ADMIN_PUBLIC_URL) : undefined;
  return {
    routes,
    resolvePath: new ResolvePath(routes),
    getHome: new GetHome(pages, catalog, branches),
    getMenu: new GetMenu(catalog, pages),
    getCategory: new GetCategory(catalog),
    getProduct: new GetProduct(catalog),
    getAllergenTable: new GetAllergenTable(catalog),
    listBranches: new ListBranches(branches, pages),
    getCity: new GetCity(branches),
    getBranch: new GetBranch(branches),
    getStaticPage: new GetStaticPage(pages),
    getSiteSettings: new GetSiteSettings(settings),
    submitForm: new SubmitForm(forms, 8, notifier),
    ping: async () => void (await db.execute(sql`select 1`)),
    listSubmissions: new ListSubmissions(forms),
    getSubmission: new GetSubmission(forms),
    updateSubmission: new UpdateSubmission(forms),
    managePages: new ManagePages(new DrizzlePageAdminRepository(db)),
    manageMedia: new ManageMedia(new DrizzleMediaAdminRepository(db)),
    manageCatalog: new ManageCatalog(new DrizzleCatalogAdminRepository(db)),
    manageBranches: new ManageBranches(new DrizzleBranchAdminRepository(db)),
    manageSeo: new ManageSeo(new DrizzleSeoAdminRepository(db)),
    manageSiteTexts: new ManageSiteTexts(new DrizzleSiteAdminRepository(db)),
    manageUsers: new ManageUsers(new DrizzleAdminUserRepository(db), new ScryptPasswordHasher(), new DrizzleSettingsKvRepository(db), process.env.ADMIN_EMAIL ?? ""),
    manageSettings: new ManageSettings(new DrizzleSettingsKvRepository(db), new DrizzleSiteAdminRepository(db)),
  };
}

export type Container = ReturnType<typeof build>;

const g = globalThis as unknown as { __doyuyoContainer?: Container };
export function container(): Container {
  // Dev hot-reload keeps globalThis: rebuild there so new use cases appear (the DB pool stays cached).
  if (process.env.NODE_ENV !== "production") return build();
  g.__doyuyoContainer ??= build();
  return g.__doyuyoContainer;
}
