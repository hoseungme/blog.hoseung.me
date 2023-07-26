import { Locale } from "../models/locale";

export function path(pathname: string, locale: Locale) {
  return locale === "ko" ? pathname : `/${locale}${pathname}`;
}
