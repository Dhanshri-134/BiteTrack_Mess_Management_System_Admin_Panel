import { createContext, useContext, useEffect, useState } from "react";
import en from "../locales/en.json";
import mr from "../locales/mr.json";

const LanguageContext = createContext();

const dictionaries = {
  en,
  mr,
};

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

  const t = (key) => {
    return dictionaries[lang][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
