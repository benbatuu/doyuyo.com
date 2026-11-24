import type { Alternates, ContentSection, Media, Seo } from "./content.ts";

export interface NavLink {
  label: string;
  href: string;
}

export interface OrderPlatform {
  name: string;
  href: string;
  logo: Media | null;
}

export interface SiteSettings {
  logo: Media | null;
  partnerLogo: Media | null;
  headerNav: NavLink[];
  footerNav: NavLink[];
  legalNav: NavLink[];
  social: { network: string; href: string }[];
  phone: { label: string; href: string } | null;
  headOffice: { address: string; mapsUrl: string | null } | null;
  orderPlatforms: { title: string; text: string; items: OrderPlatform[] };
  cookie: { text: string; button: string };
  copyright: string;
  /** Public contact e-mail (contact page, structured data). */
  email: string | null;
}

export interface StaticPage {
  id: number;
  key: string;
  title: string;
  path: string;
  banner: Media | null;
  sections: ContentSection[];
  seo: Seo;
  alternates: Alternates;
}
