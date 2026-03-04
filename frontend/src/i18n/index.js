import enTranslations from "./locales/en.json";
import plTranslations from "./locales/pl.json";

const translations = {
  en: enTranslations,
  pl: plTranslations,
};

// Get language from localStorage or default to 'en'
const getStoredLanguage = () => {
  return localStorage.getItem("preferences_language") || "en";
};

// Translation function
export const t = (key, params = {}) => {
  const language = getStoredLanguage();
  const keys = key.split(".");
  let value = translations[language] || translations.en;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      // Fallback to English if translation not found
      value = translations.en;
      for (const k2 of keys) {
        if (value && typeof value === "object" && k2 in value) {
          value = value[k2];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }

  // Replace parameters in translation string
  if (typeof value === "string" && params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : match;
    });
  }

  return typeof value === "string" ? value : key;
};

// Get current language
export const getCurrentLanguage = () => {
  return getStoredLanguage();
};

// Set language
export const setLanguage = (lang) => {
  localStorage.setItem("preferences_language", lang);
  // Trigger custom event to update all components
  window.dispatchEvent(new Event("languagechange"));
};

export default translations;


