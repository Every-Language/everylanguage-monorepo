#!/usr/bin/env node
/*
 Generates a static registry mapping book_number => png component for assets in assets/images/books-png.
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
// Use PNG outputs for fast runtime rendering
const ASSETS_DIR = path.join(ROOT, 'assets', 'images', 'books-png');
const OUT_DIR = path.join(ROOT, 'src', 'features', 'bible', 'assets');
const OUT_FILE = path.join(OUT_DIR, 'bookArtRegistry.tsx');

function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`Assets directory not found: ${ASSETS_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs
    .readdirSync(ASSETS_DIR)
    .filter(f => f.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b));

  const entries = [];
  const imports = [];

  // Compute robust relative dir from output file to assets dir
  const relDirRaw = path.relative(OUT_DIR, ASSETS_DIR);
  const relDir = relDirRaw.split(path.sep).join('/');

  for (const file of files) {
    // Expect filenames like "3_Leviticus.png" or "11_1-Kings.png"
    const match = file.match(/^(\d+)_/);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (!Number.isFinite(num)) continue;
    const varName = `Icon_${num}`;
    const relPath = `${relDir.startsWith('.') ? relDir : './' + relDir}/${file}`;
    // Use static imports to satisfy lint rules
    imports.push(`import ${varName} from '${relPath}';`);
    entries.push(`  ${num}: ${varName},`);
  }

  const header = `/* AUTO-GENERATED FILE. Do not edit directly. */\nimport type { ImageSourcePropType } from 'react-native';\n`;
  const body = `${imports.join('\n')}\n\n// Use React Native's ImageSourcePropType for compatibility across platforms\nexport type ImageLike = ImageSourcePropType;\nexport const bookNumberToImage: Record<number, ImageLike> = {\n${entries.join('\n')}\n};\n\nexport function getBookImageByNumber(\n  bookNumber: number\n): ImageLike | undefined {\n  return bookNumberToImage[bookNumber];\n}\n`;

  fs.writeFileSync(OUT_FILE, header + body, 'utf8');
  console.log(`Generated ${OUT_FILE} with ${entries.length} entries.`);
}

main();


