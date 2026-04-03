import { useEffect } from "react";
import { useRouter } from "next/router";
import { useLanguage } from "../context/LanguageContext";
import { getLiteralTranslation } from "../context/LanguageContext";

const originalTextNodes = new WeakMap();

function shouldTranslateText(text) {
  return Boolean(text && /[A-Za-z]/.test(text));
}

function translateNodeText(text, lang) {
  if (lang !== "mr" || !shouldTranslateText(text)) {
    return text;
  }

  return getLiteralTranslation(text, lang) || text;
}

function processTextNode(node, lang) {
  const original = originalTextNodes.get(node) ?? node.nodeValue;
  originalTextNodes.set(node, original);

  const translated = translateNodeText(original, lang);
  if (node.nodeValue !== translated) {
    node.nodeValue = translated;
  }
}

function processAttributes(element, lang) {
  ["placeholder", "title", "aria-label"].forEach((attr) => {
    const value = element.getAttribute(attr);
    if (!value) return;

    const dataKey = `original${attr.replace(/(^|-)([a-z])/g, (_, dash, char) => char.toUpperCase())}`;
    const original = element.dataset[dataKey] || value;
    element.dataset[dataKey] = original;

    const translated = translateNodeText(original, lang);
    if (value !== translated) {
      element.setAttribute(attr, translated);
    }
  });
}

function walkNode(root, lang) {
  if (!root) return;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );

  let current = walker.currentNode;
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      const parentTag = current.parentElement?.tagName;
      if (!["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"].includes(parentTag || "")) {
        processTextNode(current, lang);
      }
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      processAttributes(current, lang);
    }

    current = walker.nextNode();
  }
}

export default function LanguageRuntimeBridge() {
  const { lang } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    walkNode(document.body, lang);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData" && mutation.target?.nodeType === Node.TEXT_NODE) {
          processTextNode(mutation.target, lang);
          return;
        }

        mutation.addedNodes.forEach((node) => {
          walkNode(node, lang);
        });

        if (mutation.type === "attributes" && mutation.target?.nodeType === Node.ELEMENT_NODE) {
          processAttributes(mutation.target, lang);
        }
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });

    return () => observer.disconnect();
  }, [lang, router.asPath]);

  return null;
}
