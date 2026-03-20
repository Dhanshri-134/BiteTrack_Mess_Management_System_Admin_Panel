import en from './en.json' assert { type: 'json' };
import mr from './mr.json' assert { type: 'json' };

const missingInMr = Object.keys(en).filter(k => !(k in mr));
const missingInEn = Object.keys(mr).filter(k => !(k in en));

console.log("Missing in Marathi:", missingInMr);
console.log("Missing in English:", missingInEn);