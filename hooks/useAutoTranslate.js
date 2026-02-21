import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

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
        const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, target: lang }),
        });

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
