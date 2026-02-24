import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import tr from "@/locales/tr.json";
import en from "@/locales/en.json";

const STORAGE_KEY = "flowtime_lang";

const SUPPORTED_LANGS = ["tr", "en"];

const getDeviceLanguage = (): string => {
    const browserLang = navigator.language?.split("-")[0] ?? "en";
    return SUPPORTED_LANGS.includes(browserLang) ? browserLang : "en";
};

const getSavedLanguage = (): string => {
    if (typeof window === "undefined") return "en";
    try {
        return localStorage.getItem(STORAGE_KEY) || getDeviceLanguage();
    } catch {
        return "en";
    }
};

i18n.use(initReactI18next).init({
    resources: {
        tr: { translation: tr },
        en: { translation: en },
    },
    lng: getSavedLanguage(),
    fallbackLng: "en",
    interpolation: {
        escapeValue: false,
    },
});

export const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    try {
        localStorage.setItem(STORAGE_KEY, lng);
    } catch {
        // silently ignore
    }
};

export default i18n;
