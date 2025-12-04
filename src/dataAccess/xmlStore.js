const path = require('path');
const fs = require('fs/promises');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

const dataFile = path.join(__dirname, '../../data/books.xml');

const parser = new XMLParser({ ignoreAttributes: false });
const builder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  suppressEmptyNode: true,
});

function normalizeBook(raw = {}) {
  const rawId = raw.id ?? raw['@_id'] ?? raw.bookId;
  const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';
  const pickString = (val) => (val === undefined || val === null ? '' : String(val).trim());
  const pickNumber = (val) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  };
  const pickInt = (val) => {
    const num = parseInt(val, 10);
    return Number.isNaN(num) ? 0 : num;
  };
  return {
    id,
    title: pickString(raw.title),
    author: pickString(raw.author),
    category: pickString(raw.category),
    price: pickNumber(raw.price),
    publishYear: pickString(raw.publishYear ?? raw.published),
    stock: pickInt(raw.stock),
  };
}

function toXmlBook(book = {}) {
  const normalized = normalizeBook(book);
  return {
    '@_id': normalized.id || undefined,
    title: normalized.title,
    author: normalized.author,
    category: normalized.category,
    price: normalized.price,
    publishYear: normalized.publishYear,
    stock: normalized.stock,
  };
}

function buildXmlFromBooks(books = []) {
  const xmlObj = { library: { book: books.map((b) => toXmlBook(b)) } };
  return builder.build(xmlObj);
}

async function ensureFileExists() {
  try {
    await fs.access(dataFile);
  } catch {
    const seed = '<?xml version="1.0" encoding="UTF-8"?><library></library>';
    await fs.writeFile(dataFile, seed, 'utf-8');
  }
}

async function readLibrary() {
  await ensureFileExists();
  const xml = await fs.readFile(dataFile, 'utf-8');
  const parsed = parser.parse(xml) || {};
  const library = parsed.library || {};
  const booksRaw = library.book || [];
  const booksArr = Array.isArray(booksRaw) ? booksRaw : [booksRaw].filter(Boolean);
  const books = booksArr.map((book) => normalizeBook(book));
  return { library, books };
}

async function writeLibrary(books) {
  const xml = buildXmlFromBooks(books);
  await fs.writeFile(dataFile, xml, 'utf-8');
  return books;
}

async function readXmlRaw() {
  await ensureFileExists();
  return fs.readFile(dataFile, 'utf-8');
}

module.exports = {
  readLibrary,
  writeLibrary,
  dataFile,
  readXmlRaw,
  buildXmlFromBooks,
};
