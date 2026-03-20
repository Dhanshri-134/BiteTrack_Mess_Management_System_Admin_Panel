import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { API_BASE } from "../lib/api";

export default function useAutoTranslate(text) {
  const { lang } = useLanguage();
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    if (!text || lang === "en") {
      setTranslated(text);
      return;
    }

    const translate = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/translate/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, target: lang }),
        });

        if (!res.ok) {
          throw new Error("Translation unavailable");
        }

        const data = await res.json();
        setTranslated(data.translatedText || text);
      } catch {
        setTranslated(text);
      }
    };

    translate();
  }, [text, lang]);

  return translated;
}
