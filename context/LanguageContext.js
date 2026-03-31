import { createContext, useContext, useEffect, useState } from "react";
import en from "../locales/en.json";
import mr from "../locales/mr.json";

const LanguageContext = createContext();

const dictionaries = { en, mr };

function getNestedValue(source, key) {
  return String(key || "")
    .split(".")
    .reduce((value, part) => (value && value[part] !== undefined ? value[part] : undefined), source);
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved) setLang(saved);
  }, []);

  const toggleLanguage = () => {
    const next = lang === "en" ? "mr" : "en";
    setLang(next);
    localStorage.setItem("lang", next);
  };

  const t = (key, params = {}) => {
    const template =
      getNestedValue(dictionaries[lang], key) ??
      getNestedValue(dictionaries.en, key) ??
      key;

    if (typeof template !== "string") {
      return template;
    }

    return Object.entries(params).reduce((message, [paramKey, value]) => {
      return message.replaceAll(`{{${paramKey}}}`, String(value ?? ""));
    }, template);
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    return {
      t: (key) => key,
      lang: "en",
      toggleLanguage: () => {}
    };
  }
  return context;
}
