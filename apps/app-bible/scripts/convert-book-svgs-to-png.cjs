#!/usr/bin/env node
/*
 Converts assets/images/books/*.svg to PNGs at a fixed size for fast runtime rendering.
 Output: assets/images/books-png/*.png
*/
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'assets', 'images', 'books');
const OUT_DIR = path.join(ROOT, 'assets', 'images', 'books-png');
// Given your on-screen size (~2cm on common DPIs), 192px is generally sufficient.
const SIZE = Number(process.env.BOOK_ICON_SIZE || 192); // pixels

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Source SVG directory not found: ${SRC_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs
    .readdirSync(SRC_DIR)
    .filter(f => f.toLowerCase().endsWith('.svg'))
    .sort((a, b) => a.localeCompare(b));

  let converted = 0;
  for (const file of files) {
    const inPath = path.join(SRC_DIR, file);
    const base = file.replace(/\.svg$/i, '');
    const outPath = path.join(OUT_DIR, `${base}.png`);
    try {
      const svgBuffer = fs.readFileSync(inPath);
      await sharp(svgBuffer)
        .resize(SIZE, SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png({ compressionLevel: 9 })
        .toFile(outPath);
      converted++;
    } catch (e) {
      console.warn(`Failed to convert ${file}:`, e.message);
    }
  }

  console.log(`Converted ${converted} SVGs to PNG in ${OUT_DIR}`);
}

main();
