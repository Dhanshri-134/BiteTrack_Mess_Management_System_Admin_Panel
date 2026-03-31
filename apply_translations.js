const fs = require('fs');
const path = require('path');

const untranslated = fs.readFileSync('untranslated_utf8.txt', 'utf8').split('\n').filter(Boolean);
const translationsEN = {};
const translationsMR = {};

function toCamelCase(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
}

const fileGroups = {};
for (const line of untranslated) {
  const match = line.match(/^(.*?):(\d+):\s*(JSX Text|JSX Prop|Prop Text)\s*->\s*"(.*)"$/);
  if (match) {
    const [, file, lineNum, type, text] = match;
    if (!fileGroups[file]) fileGroups[file] = [];
    fileGroups[file].push({ line: parseInt(lineNum, 10), type, text });
  }
}

for (const [file, items] of Object.entries(fileGroups)) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  
  items.sort((a, b) => b.line - a.line);
  
  let needsHook = false;
  
  for (const item of items) {
    // skip very long strings or variables
    if (item.text.length > 50 || item.text.includes('{') || item.text.includes('}')) continue;

    const key = toCamelCase(item.text);
    if (!key) continue;
    
    translationsEN[key] = item.text;
    translationsMR[key] = item.text + " (MR)"; // Placeholder to identify easily
    
    let lineContent = lines[item.line - 1];
    let before = lineContent;
    
    if (item.type === 'JSX Text') {
      lineContent = lineContent.replace(`>${item.text}<`, `>{t("${key}")}<`);
      if (lineContent === before) {
        lineContent = lineContent.replace(`>${item.text}`, `>{t("${key}")}`);
      }
    } else if (item.type === 'Prop Text') {
      lineContent = lineContent.replace(`"${item.text}"`, `t("${key}")`);
      lineContent = lineContent.replace(`'${item.text}'`, `t("${key}")`);
    } else if (item.type === 'JSX Prop') {
      lineContent = lineContent.replace(`"${item.text}"`, `{t("${key}")}`);
      lineContent = lineContent.replace(`'${item.text}'`, `{t("${key}")}`);
    }
    
    if (lineContent !== before) {
      lines[item.line - 1] = lineContent;
      needsHook = true;
    }
  }
  
  content = lines.join('\n');
  
  if (needsHook && !content.includes('useLanguage')) {
    const contextPath = path.join(__dirname, 'context', 'LanguageContext');
    let relativePath = path.relative(path.dirname(file), contextPath).replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
    
    content = `import { useLanguage } from "${relativePath}";\n` + content;
    
    // Attempt to inject hook
    content = content.replace(/(export (?:default )?(?:function|const) [A-Za-z0-9_]+\s*(?:=\s*)?\([^)]*\)\s*(?:=>)?\s*\{)/, `$1\n  const { t } = useLanguage();\n`);
  }
  
  fs.writeFileSync(file, content, 'utf8');
}

const enPath = path.join(__dirname, 'locales', 'en.json');
const mrPath = path.join(__dirname, 'locales', 'mr.json');

const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const mrJson = JSON.parse(fs.readFileSync(mrPath, 'utf8'));

Object.assign(enJson, translationsEN);
Object.assign(mrJson, translationsMR);

fs.writeFileSync(enPath, JSON.stringify(enJson, null, 2), 'utf8');
fs.writeFileSync(mrPath, JSON.stringify(mrJson, null, 2), 'utf8');

console.log("Translation injection completed successfully.");
