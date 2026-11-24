import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  // AR has no UI strings yet: fall back to EN labels.
  const file = locale === "ar" ? "en" : locale;
  return { locale, messages: (await import(`../../messages/${file}.json`)).default, timeZone: "Europe/Istanbul" };
});
