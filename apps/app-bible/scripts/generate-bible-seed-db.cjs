#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Generate a prebuilt SQLite database for initial Bible structure seeding.
 *
 * Input: assets/data/bible-structure.json (produced by scripts/generate-bible-structure-json.cjs)
 * Output: assets/seed/bible-seed.db
 */

const fs = require('fs');
const path = require('path');

// Use better-sqlite3 for fast, synchronous DB writes at build time
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error(
    'better-sqlite3 is not installed. Install with: npm i -D better-sqlite3'
  );
  process.exit(1);
}

const STRUCTURE_JSON = path.join(
  __dirname,
  '..',
  'assets',
  'data',
  'bible-structure.json'
);
const OUT_DIR = path.join(__dirname, '..', 'assets', 'seed');
const OUT_DB = path.join(OUT_DIR, 'bible-seed.db');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  if (!fs.existsSync(STRUCTURE_JSON)) {
    console.error(
      'Missing bible-structure.json. Generate it first with: npm run assets:generate-bible-structure'
    );
    process.exit(1);
  }

  console.log('Generating prebuilt SQLite seed at', OUT_DB);
  ensureDir(OUT_DIR);

  const payload = JSON.parse(fs.readFileSync(STRUCTURE_JSON, 'utf8'));

  const db = new Database(OUT_DB);
  try {
    db.pragma('journal_mode = WAL');
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE IF NOT EXISTS bible_versions (
        id TEXT PRIMARY KEY,
        name TEXT,
        structure_notes TEXT
      );
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        name TEXT,
        book_number INTEGER,
        testament TEXT,
        bible_version_id TEXT,
        global_order INTEGER
      );
      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        book_id TEXT,
        chapter_number INTEGER,
        total_verses INTEGER,
        global_order INTEGER
      );
      CREATE TABLE IF NOT EXISTS verses (
        id TEXT PRIMARY KEY,
        chapter_id TEXT,
        verse_number INTEGER,
        global_order INTEGER
      );
    `);

    const insertInTransaction = db.transaction(() => {
      const insertVersion = db.prepare(
        'INSERT OR REPLACE INTO bible_versions (id, name, structure_notes) VALUES (?, ?, ?)'
      );
      for (const r of payload.bible_versions) {
        insertVersion.run(r.id, r.name, r.structure_notes ?? null);
      }

      const insertBook = db.prepare(
        'INSERT OR REPLACE INTO books (id, name, book_number, testament, bible_version_id, global_order) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const r of payload.books) {
        const bookOrder = r.book_number; // direct mapping
        insertBook.run(
          r.id,
          r.name,
          r.book_number,
          r.testament,
          r.bible_version_id,
          bookOrder
        );
      }

      const insertChapter = db.prepare(
        'INSERT OR REPLACE INTO chapters (id, book_id, chapter_number, total_verses, global_order) VALUES (?, ?, ?, ?, ?)'
      );
      for (const r of payload.chapters) {
        // (book_number * 1000) + chapter_number
        const book = payload.books.find(b => b.id === r.book_id);
        const bookNumber = book ? book.book_number : 0;
        const chapterOrder = bookNumber * 1000 + r.chapter_number;
        insertChapter.run(
          r.id,
          r.book_id,
          r.chapter_number,
          r.total_verses,
          chapterOrder
        );
      }

      const insertVerse = db.prepare(
        'INSERT OR REPLACE INTO verses (id, chapter_id, verse_number, global_order) VALUES (?, ?, ?, ?)'
      );
      const CHUNK = 5000;
      for (let i = 0; i < payload.verses.length; i += CHUNK) {
        const slice = payload.verses.slice(i, i + CHUNK);
        db.transaction(() => {
          for (const r of slice) {
            // (book_number * 1_000_000) + (chapter_number * 1000) + verse_number
            const chapter = payload.chapters.find(c => c.id === r.chapter_id);
            const book = chapter
              ? payload.books.find(b => b.id === chapter.book_id)
              : null;
            const bookNumber = book ? book.book_number : 0;
            const chapterNumber = chapter ? chapter.chapter_number : 0;
            const verseOrder =
              bookNumber * 1000000 + chapterNumber * 1000 + r.verse_number;
            insertVerse.run(r.id, r.chapter_id, r.verse_number, verseOrder);
          }
        })();
      }
    });

    insertInTransaction();
  } finally {
    db.close();
  }

  console.log('Seed DB written:', OUT_DB);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('Failed to generate prebuilt SQLite seed:', e);
    process.exit(1);
  }
}

module.exports = { main };
