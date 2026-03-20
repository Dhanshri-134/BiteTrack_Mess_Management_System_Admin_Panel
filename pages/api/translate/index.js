import en from "../../../locales/en.json";
import mr from "../../../locales/mr.json";

const dictionaries = { en, mr };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, target = "en" } = req.body || {};
  const dictionary = dictionaries[target] || dictionaries.en;

  if (!text || typeof text !== "string") {
    return res.status(200).json({ translatedText: text || "" });
  }

  return res.status(200).json({
    translatedText: dictionary[text] || text,
  });
}
