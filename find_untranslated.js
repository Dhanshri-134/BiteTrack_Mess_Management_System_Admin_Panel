const fs = require('fs');
const path = require('path');

const dirsToScan = [
  path.join(__dirname, 'pages'),
  path.join(__dirname, 'components')
];

const results = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // RegEx for finding text inside JSX tags: > text <
  // RegEx for finding string literals in object properties like label: "text" or title: "text"
  const jsxTextRegex = />\s*([a-zA-Z][^<]*?)\s*<\//g;
  const propTextRegex = /(?:label|title|placeholder|alt|title)\s*:\s*(["'])(.+?)\1/g;
  const propJSXRegex = /(?:label|title|placeholder|alt|title)=["'](.+?)["']/g;

  lines.forEach((line, i) => {
    // Ignore lines that already have t(
    if (line.includes('t(') || line.includes('console.log') || line.trim().startsWith('//')) {
      return;
    }
    
    let match;
    let found = false;
    
    while ((match = jsxTextRegex.exec(line)) !== null) {
      if (!match[1].startsWith('{') && match[1].trim().length > 1) {
        results.push(`${filePath}:${i + 1}: JSX Text -> "${match[1].trim()}"`);
        found = true;
      }
    }
    
    while ((match = propTextRegex.exec(line)) !== null) {
      if (match[2].trim().length > 1 && !match[2].includes('{')) {
        results.push(`${filePath}:${i + 1}: Prop Text -> "${match[2].trim()}"`);
        found = true;
      }
    }

    while ((match = propJSXRegex.exec(line)) !== null) {
      if (match[1].trim().length > 1 && !match[1].includes('{')) {
        results.push(`${filePath}:${i + 1}: JSX Prop -> "${match[1].trim()}"`);
        found = true;
      }
    }
  });
}

dirsToScan.forEach(scanDir);

fs.writeFileSync('untranslated_utf8.txt', results.join('\n'), 'utf-8');
