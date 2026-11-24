/**
 * Database schema. Pattern: a base table holds language-neutral data, a `*_translations`
 * table holds one row per locale. Public URLs live in `routes` (one row per locale per entity),
 * so slugs can change without touching the entity; old paths go to `redirects`.
 */
import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

const seo = {
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
};

// ---------- media
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  path: text("path").notNull().unique(), // served path, e.g. /media/legacy/storage/706/x.webp
  mime: text("mime").notNull().default(""),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes").notNull().default(0),
  sha256: text("sha256"),
  legacyUrl: text("legacy_url").unique(), // where it came from on the old site
  originalName: text("original_name"), // file name at upload time (panel uploads)
  folder: text("folder"), // panel grouping chosen at upload: product | category | branch | page | brand
  ...timestamps,
});

export const mediaTranslations = pgTable(
  "media_translations",
  {
    mediaId: integer("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    alt: text("alt").notNull().default(""),
    title: text("title").notNull().default(""), // title attribute / SEO name
    caption: text("caption").notNull().default(""), // visible caption or description
  },
  (t) => [primaryKey({ columns: [t.mediaId, t.locale] })],
);

// ---------- routing
export const routes = pgTable(
  "routes",
  {
    id: serial("id").primaryKey(),
    locale: text("locale").notNull(),
    path: text("path").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("routes_path_uq").on(t.path), uniqueIndex("routes_entity_locale_uq").on(t.entityType, t.entityId, t.locale)],
);

export const redirects = pgTable(
  "redirects",
  {
    id: serial("id").primaryKey(),
    fromPath: text("from_path").notNull(),
    toPath: text("to_path").notNull(),
    status: integer("status").notNull().default(301),
    source: text("source").notNull().default("manual"), // legacy | slug-change | manual
    hits: integer("hits").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("redirects_from_uq").on(t.fromPath)],
);

// ---------- pages
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  template: text("template").notNull().default("static"),
  bannerId: integer("banner_id").references(() => media.id),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

export const pageTranslations = pgTable(
  "page_translations",
  {
    pageId: integer("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    sections: jsonb("sections").notNull().default([]),
    ...seo,
    sourceUrl: text("source_url"),
  },
  (t) => [primaryKey({ columns: [t.pageId, t.locale] })],
);

// ---------- catalog
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  sort: integer("sort").notNull().default(0),
  imageId: integer("image_id").references(() => media.id),
  bannerId: integer("banner_id").references(() => media.id),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

export const categoryTranslations = pgTable(
  "category_translations",
  {
    categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    imageId: integer("image_id").references(() => media.id), // locale-specific card image (EN site has its own)
    ...seo,
    sourceUrl: text("source_url"),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.locale] })],
);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  imageId: integer("image_id").references(() => media.id),
  cardImageId: integer("card_image_id").references(() => media.id),
  priceKurus: integer("price_kurus"), // null = not shown
  showPrice: boolean("show_price").notNull().default(false),
  spiceLevel: integer("spice_level"),
  /** Allergen + nutrition data matched from the brand's PDF table (see seed/allergen-matching.ts). */
  allergenInfo: jsonb("allergen_info"),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

export const productTranslations = pgTable(
  "product_translations",
  {
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    shortDescription: text("short_description").notNull().default(""),
    description: text("description").notNull().default(""),
    content: jsonb("content").notNull().default([]),
    imageAlt: text("image_alt").notNull().default(""),
    ...seo,
    sourceUrl: text("source_url"),
  },
  (t) => [primaryKey({ columns: [t.productId, t.locale] })],
);

/** A product can be listed in several categories; `isPrimary` decides its canonical URL. */
export const productCategories = pgTable(
  "product_categories",
  {
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    sort: integer("sort").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] }), index("product_categories_cat_idx").on(t.categoryId, t.sort)],
);

// ---------- branches
export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  country: text("country").notNull(), // turkiye | uae
  ...timestamps,
});

export const cityTranslations = pgTable(
  "city_translations",
  {
    cityId: integer("city_id").notNull().references(() => cities.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...seo,
  },
  (t) => [primaryKey({ columns: [t.cityId, t.locale] })],
);

export const branches = pgTable(
  "branches",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    cityId: integer("city_id").notNull().references(() => cities.id),
    district: text("district"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    geoPrecise: boolean("geo_precise").notNull().default(false),
    mapsUrl: text("maps_url"),
    imageId: integer("image_id").references(() => media.id),
    phone: text("phone"),
    status: text("status").notNull().default("open"), // open | soon | closed
    ...timestamps,
  },
  (t) => [index("branches_city_idx").on(t.cityId)],
);

export const branchTranslations = pgTable(
  "branch_translations",
  {
    branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    address: text("address").notNull().default(""),
    hours: jsonb("hours").notNull().default([]),
    description: jsonb("description").notNull().default([]),
    ...seo,
    sourceUrl: text("source_url"),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.locale] })],
);

// ---------- settings (key/value per locale: site chrome, order platforms, allergen table…)
export const settings = pgTable(
  "settings",
  {
    key: text("key").notNull(),
    locale: text("locale").notNull().default("*"),
    value: jsonb("value").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.key, t.locale] })],
);

// ---------- form submissions (contact, careers, investor) -> admin inbox
export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(), // contact | careers | investor
    status: text("status").notNull().default("new"), // new | in_progress | done | spam
    locale: text("locale").notNull(),
    data: jsonb("data").notNull(), // the visitor's answers
    pagePath: text("page_path").notNull(),
    pageTitle: text("page_title"),
    referrer: text("referrer"),
    utm: jsonb("utm"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    device: jsonb("device"), // { type, os, browser, screen, language }
    geo: jsonb("geo"), // { country, region, city, timezone, source }
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentVersion: text("consent_version"),
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (t) => [index("form_submissions_type_idx").on(t.type, t.createdAt), index("form_submissions_status_idx").on(t.status)],
);

// ---------- panel users (roles: owner | editor | viewer; owner from env is not stored here)
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  role: text("role").notNull().default("viewer"),
  active: boolean("active").notNull().default(true),
  passwordHash: text("password_hash"),
  ...timestamps,
});

// ---------- relations (for the query builder)
export const categoriesRelations = relations(categories, ({ many, one }) => ({
  translations: many(categoryTranslations),
  image: one(media, { fields: [categories.imageId], references: [media.id] }),
}));
export const categoryTranslationsRelations = relations(categoryTranslations, ({ one }) => ({
  category: one(categories, { fields: [categoryTranslations.categoryId], references: [categories.id] }),
}));
export const productsRelations = relations(products, ({ many }) => ({
  translations: many(productTranslations),
  categories: many(productCategories),
}));
export const productTranslationsRelations = relations(productTranslations, ({ one }) => ({
  product: one(products, { fields: [productTranslations.productId], references: [products.id] }),
}));
export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, { fields: [productCategories.categoryId], references: [categories.id] }),
}));
