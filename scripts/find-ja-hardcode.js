const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../frontend/src');
const JA_REGEX = /[ぁ-んァ-ヶ｡-ﾟ、。「」『』【】〔〕・…]/;
const SKIP_FILES = ['i18n.ts'];
const SKIP_LINE_PATTERNS = [
  /^\s*\/\//,         // single-line comment
  /^\s*\*\s/,         // JSDoc line
  /REGEX|regex|RegExp/, // regex definitions
];

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !SKIP_FILES.includes(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

let total = 0;

for (const file of walk(SRC)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const rel = path.relative(SRC, file);

  lines.forEach((line, i) => {
    if (!JA_REGEX.test(line)) return;
    if (SKIP_LINE_PATTERNS.some((p) => p.test(line))) return;
    const text = line.trim();
    console.log(`${rel}:${i + 1}:${text}`);
    total++;
  });
}

console.log(`\n合計: ${total} 件`);
