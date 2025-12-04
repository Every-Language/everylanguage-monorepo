#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Generate bible-structure.json matching the SQL seed script semantics
 *
 * Output: assets/data/bible-structure.json with:
 * {
 *   bible_versions: [{ id, name, structure_notes }],
 *   books: [{ id, name, book_number, testament, bible_version_id }],
 *   chapters: [{ id, book_id, chapter_number, total_verses }],
 *   verses: [{ id, chapter_id, verse_number }]
 * }
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'assets', 'data');
const OUTPUT_FILE = path.join(OUTPUT_PATH, 'bible-structure.json');

const CONFIG = {
  version: 'protestant-standard',
};

const BOOK_NAME_TO_OSIS = {
  genesis: 'Gen',
  exodus: 'Exod',
  leviticus: 'Lev',
  numbers: 'Num',
  deuteronomy: 'Deut',
  joshua: 'Josh',
  judges: 'Judg',
  ruth: 'Ruth',
  '1_samuel': '1Sam',
  '2_samuel': '2Sam',
  '1_kings': '1Kgs',
  '2_kings': '2Kgs',
  '1_chronicles': '1Chr',
  '2_chronicles': '2Chr',
  ezra: 'Ezra',
  nehemiah: 'Neh',
  esther: 'Esth',
  job: 'Job',
  psalms: 'Ps',
  proverbs: 'Prov',
  ecclesiastes: 'Eccl',
  song_of_songs: 'Song',
  isaiah: 'Isa',
  jeremiah: 'Jer',
  lamentations: 'Lam',
  ezekiel: 'Ezek',
  daniel: 'Dan',
  hosea: 'Hos',
  joel: 'Joel',
  amos: 'Amos',
  obadiah: 'Obad',
  jonah: 'Jonah',
  micah: 'Mic',
  nahum: 'Nah',
  habakkuk: 'Hab',
  zephaniah: 'Zeph',
  haggai: 'Hag',
  zechariah: 'Zech',
  malachi: 'Mal',
  matthew: 'Matt',
  mark: 'Mark',
  luke: 'Luke',
  john: 'John',
  acts: 'Acts',
  romans: 'Rom',
  '1_corinthians': '1Cor',
  '2_corinthians': '2Cor',
  galatians: 'Gal',
  ephesians: 'Eph',
  philippians: 'Phil',
  colossians: 'Col',
  '1_thessalonians': '1Thess',
  '2_thessalonians': '2Thess',
  '1_timothy': '1Tim',
  '2_timothy': '2Tim',
  titus: 'Titus',
  philemon: 'Phlm',
  hebrews: 'Heb',
  james: 'Jas',
  '1_peter': '1Pet',
  '2_peter': '2Pet',
  '1_john': '1John',
  '2_john': '2John',
  '3_john': '3John',
  jude: 'Jude',
  revelation: 'Rev',
};

function formatBookName(bookName) {
  return bookName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const PROTESTANT_BIBLE = [
  { name: 'genesis', book_number: 1, chapters: [31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26] },
  { name: 'exodus', book_number: 2, chapters: [22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38] },
  { name: 'leviticus', book_number: 3, chapters: [17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34] },
  { name: 'numbers', book_number: 4, chapters: [54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13] },
  { name: 'deuteronomy', book_number: 5, chapters: [46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12] },
  { name: 'joshua', book_number: 6, chapters: [18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33] },
  { name: 'judges', book_number: 7, chapters: [36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25] },
  { name: 'ruth', book_number: 8, chapters: [22,23,18,22] },
  { name: '1_samuel', book_number: 9, chapters: [28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13] },
  { name: '2_samuel', book_number: 10, chapters: [27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25] },
  { name: '1_kings', book_number: 11, chapters: [53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53] },
  { name: '2_kings', book_number: 12, chapters: [18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30] },
  { name: '1_chronicles', book_number: 13, chapters: [54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30] },
  { name: '2_chronicles', book_number: 14, chapters: [17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23] },
  { name: 'ezra', book_number: 15, chapters: [11,70,13,24,17,22,28,36,15,44] },
  { name: 'nehemiah', book_number: 16, chapters: [11,20,32,23,19,19,73,18,38,39,36,47,31] },
  { name: 'esther', book_number: 17, chapters: [22,23,15,17,14,14,10,17,32,3] },
  { name: 'job', book_number: 18, chapters: [22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17] },
  { name: 'psalms', book_number: 19, chapters: [6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6] },
  { name: 'proverbs', book_number: 20, chapters: [33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31] },
  { name: 'ecclesiastes', book_number: 21, chapters: [18,26,22,16,20,12,29,17,18,20,10,14] },
  { name: 'song_of_songs', book_number: 22, chapters: [17,17,11,16,16,13,13,14] },
  { name: 'isaiah', book_number: 23, chapters: [31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24] },
  { name: 'jeremiah', book_number: 24, chapters: [19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34] },
  { name: 'lamentations', book_number: 25, chapters: [22,22,66,22,22] },
  { name: 'ezekiel', book_number: 26, chapters: [28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35] },
  { name: 'daniel', book_number: 27, chapters: [21,49,30,37,31,28,28,27,27,21,45,13] },
  { name: 'hosea', book_number: 28, chapters: [11,23,5,19,15,11,16,14,17,15,12,14,16,9] },
  { name: 'joel', book_number: 29, chapters: [20,32,21] },
  { name: 'amos', book_number: 30, chapters: [15,16,15,13,27,14,17,14,15] },
  { name: 'obadiah', book_number: 31, chapters: [21] },
  { name: 'jonah', book_number: 32, chapters: [17,10,10,11] },
  { name: 'micah', book_number: 33, chapters: [16,13,12,13,15,16,20] },
  { name: 'nahum', book_number: 34, chapters: [15,13,19] },
  { name: 'habakkuk', book_number: 35, chapters: [17,20,19] },
  { name: 'zephaniah', book_number: 36, chapters: [18,15,20] },
  { name: 'haggai', book_number: 37, chapters: [15,23] },
  { name: 'zechariah', book_number: 38, chapters: [21,13,10,14,11,15,14,23,17,12,17,14,9,21] },
  { name: 'malachi', book_number: 39, chapters: [14,17,18,6] },
  { name: 'matthew', book_number: 40, chapters: [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20] },
  { name: 'mark', book_number: 41, chapters: [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20] },
  { name: 'luke', book_number: 42, chapters: [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53] },
  { name: 'john', book_number: 43, chapters: [51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25] },
  { name: 'acts', book_number: 44, chapters: [26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31] },
  { name: 'romans', book_number: 45, chapters: [32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27] },
  { name: '1_corinthians', book_number: 46, chapters: [31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24] },
  { name: '2_corinthians', book_number: 47, chapters: [24,17,18,18,21,18,16,24,15,18,33,21,14] },
  { name: 'galatians', book_number: 48, chapters: [24,21,29,31,26,18] },
  { name: 'ephesians', book_number: 49, chapters: [23,22,21,32,33,24] },
  { name: 'philippians', book_number: 50, chapters: [30,30,21,23] },
  { name: 'colossians', book_number: 51, chapters: [29,23,25,18] },
  { name: '1_thessalonians', book_number: 52, chapters: [10,20,13,18,28] },
  { name: '2_thessalonians', book_number: 53, chapters: [12,17,18] },
  { name: '1_timothy', book_number: 54, chapters: [20,15,16,16,25,21] },
  { name: '2_timothy', book_number: 55, chapters: [18,26,17,22] },
  { name: 'titus', book_number: 56, chapters: [16,15,15] },
  { name: 'philemon', book_number: 57, chapters: [25] },
  { name: 'hebrews', book_number: 58, chapters: [14,18,19,16,14,20,28,13,28,39,40,29,25] },
  { name: 'james', book_number: 59, chapters: [27,26,18,17,20] },
  { name: '1_peter', book_number: 60, chapters: [25,25,22,19,14] },
  { name: '2_peter', book_number: 61, chapters: [21,22,18] },
  { name: '1_john', book_number: 62, chapters: [10,29,24,21,21] },
  { name: '2_john', book_number: 63, chapters: [13] },
  { name: '3_john', book_number: 64, chapters: [14] },
  { name: 'jude', book_number: 65, chapters: [25] },
  { name: 'revelation', book_number: 66, chapters: [20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21] },
];

function main() {
  console.log('Generating bible-structure.json...');
  const bibleVersionId = `bible-version-${CONFIG.version}`;

  const bible_versions = [
    {
      id: bibleVersionId,
      name: 'Protestant Bible (Standard)',
      structure_notes: 'Standard Protestant Bible with 66 books (39 OT, 27 NT)',
    },
  ];

  const books = [];
  const chapters = [];
  const verses = [];

  for (const book of PROTESTANT_BIBLE) {
    const osis = BOOK_NAME_TO_OSIS[book.name].toLowerCase();
    const bookName = formatBookName(book.name);
    const testament = book.book_number <= 39 ? 'old' : 'new';
    books.push({
      id: osis,
      name: bookName,
      book_number: book.book_number,
      testament,
      bible_version_id: bibleVersionId,
    });

    book.chapters.forEach((verseCount, idx) => {
      const chapter_number = idx + 1;
      const chapter_id = `${osis}-${chapter_number}`;
      chapters.push({
        id: chapter_id,
        book_id: osis,
        chapter_number,
        total_verses: verseCount,
      });

      for (let vn = 1; vn <= verseCount; vn++) {
        verses.push({
          id: `${osis}-${chapter_number}-${vn}`,
          chapter_id,
          verse_number: vn,
        });
      }
    });
  }

  const payload = { bible_versions, books, chapters, verses };
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload));
  console.log('Wrote', OUTPUT_FILE);
  console.log('Counts:', {
    bible_versions: bible_versions.length,
    books: books.length,
    chapters: chapters.length,
    verses: verses.length,
  });
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('Failed to generate bible structure:', e);
    process.exit(1);
  }
}

module.exports = { main };


