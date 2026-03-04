import { getCurrentLanguage } from "../i18n";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { t } from "../i18n";

const LOCALE_MAP = {
  pl: "pl-PL",
  en: "en-US",
};

/**
 * Get BCP 47 locale string for current app language
 */
export const getLocale = () => {
  const lang = getCurrentLanguage();
  return LOCALE_MAP[lang] || LOCALE_MAP.en;
};

/**
 * Get date-fns locale object for current app language
 */
export const getDateFnsLocale = () => {
  const lang = getCurrentLanguage();
  return lang === "pl" ? pl : undefined;
};

/**
 * Format date for display (e.g. "February 24, 2026" or "24 lutego 2026")
 */
export const formatLocaleDate = (dateString, options = {}) => {
  const locale = getLocale();
  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString(locale, {
    ...defaultOptions,
    ...options,
  });
};

/**
 * Format date with date-fns (e.g. "MMM" for month abbreviation - "Feb" or "lut" in Polish)
 */
export const formatDateFnsLocale = (date, formatStr) => {
  const locale = getDateFnsLocale();
  return format(date, formatStr, locale ? { locale } : {});
};

/**
 * Format duration (hours) for display - "4h 55m" (en) or "4 godz. 55 min" (pl)
 */
export const formatLocaleDuration = (hours) => {
  const lang = getCurrentLanguage();
  const h = Math.floor(hours || 0);
  const m = Math.round(((hours || 0) - h) * 60);
  if (lang === "pl") {
    const hShort = t("common.hoursShort");
    const mShort = t("common.minutesShort");
    return `${h} ${hShort} ${String(m).padStart(2, "0")} ${mShort}`;
  }
  return `${h}h ${String(m).padStart(2, "0")}m`;
};
