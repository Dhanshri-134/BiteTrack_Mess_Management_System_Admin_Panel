import { createContext, useContext, useEffect, useState } from "react";
import en from "../locales/en.json";
import mr from "../locales/mr.json";
import { mrFallbackByKey, mrFallbackByLiteral } from "../lib/translationFallbacks";

const LanguageContext = createContext();

const dictionaries = { en, mr };

function flattenMessages(source, prefix = "", acc = {}) {
  Object.entries(source || {}).forEach(([key, value]) => {
    const nestedKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenMessages(value, nestedKey, acc);
      return;
    }
    acc[nestedKey] = value;
  });
  return acc;
}

const flatEn = flattenMessages(en);
const flatMr = flattenMessages(mr);
const mrLiteralMap = Object.entries(flatEn).reduce((map, [key, englishValue]) => {
  const marathiValue = flatMr[key];
  if (
    typeof englishValue === "string" &&
    typeof marathiValue === "string" &&
    !/\(MR\)/i.test(marathiValue) &&
    marathiValue.trim() &&
    marathiValue.trim() !== englishValue.trim()
  ) {
    map[normalizeLiteral(englishValue)] = marathiValue;
  }
  return map;
}, {});

Object.entries(mrFallbackByLiteral).forEach(([literal, translated]) => {
  mrLiteralMap[normalizeLiteral(literal)] = translated;
});

function getNestedValue(source, key) {
  return String(key || "")
    .split(".")
    .reduce((value, part) => (value && value[part] !== undefined ? value[part] : undefined), source);
}

function normalizeLiteral(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function getLiteralTranslation(text, lang = "en") {
  if (lang !== "mr") return text;

  const literalKey = normalizeLiteral(text);
  return mrLiteralMap[literalKey] || mrFallbackByLiteral[text] || null;
}

function resolveTemplate(key, lang) {
  const keyString = String(key || "");
  const languageTemplate = getNestedValue(dictionaries[lang], keyString);
  const fallbackByKey = lang === "mr" ? mrFallbackByKey[keyString] : undefined;

  if (typeof languageTemplate === "string" && !/\(MR\)/i.test(languageTemplate)) {
    return languageTemplate;
  }

  if (fallbackByKey) {
    return fallbackByKey;
  }

  const englishTemplate = getNestedValue(dictionaries.en, keyString);
  const literalFallback = getLiteralTranslation(englishTemplate ?? keyString, lang);
  return englishTemplate ?? literalFallback ?? keyString;
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
    const template = resolveTemplate(key, lang);

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
