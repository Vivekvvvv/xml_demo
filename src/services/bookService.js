const { v4: uuidv4 } = require('uuid');
const { readLibrary, writeLibrary, readXmlRaw, buildXmlFromBooks } = require('../dataAccess/xmlStore');

const SORTABLE_FIELDS = ['title', 'author', 'category', 'price', 'publishYear', 'stock'];

function sanitizeBookInput(payload = {}) {
  const publishYear = payload.publishYear || payload.published || '';
  return {
    id: payload.id ? String(payload.id).trim() : '',
    title: String(payload.title || '').trim(),
    author: String(payload.author || '').trim(),
    price: payload.price !== undefined && payload.price !== '' ? Number(payload.price) : 0,
    category: String(payload.category || '').trim(),
    stock: payload.stock !== undefined && payload.stock !== '' ? parseInt(payload.stock, 10) : 0,
    publishYear: String(publishYear || '').trim(),
  };
}

function validateBook(book) {
  if (!book.title || !book.author) return '标题和作者不能为空';
  if (Number.isNaN(book.price) || book.price < 0) return '价格必须是非负数字';
  if (Number.isNaN(book.stock) || book.stock < 0) return '库存必须是非负整数';
  if (!book.publishYear) return '出版年份不能为空';
  return null;
}

function ensureId(book) {
  if (book.id) return book.id;
  return `BK-${uuidv4().slice(0, 8).toUpperCase()}`;
}

function normalizeForSave(book) {
  const sanitized = sanitizeBookInput(book);
  return { ...sanitized, id: ensureId(sanitized) };
}

function makeTitleAuthorKey(book = {}) {
  const title = String(book.title || '').trim().toLowerCase();
  const author = String(book.author || '').trim().toLowerCase();
  if (!title || !author) return '';
  return `${title}__${author}`;
}

function dedupeBooks(books = []) {
  const seen = new Set();
  const unique = [];
  for (const book of books) {
    const key = makeTitleAuthorKey(book);
    if (key && seen.has(key)) {
      continue;
    }
    if (key) seen.add(key);
    unique.push(book);
  }
  return unique;
}

async function loadUniqueBooks() {
  const { books } = await readLibrary();
  const unique = dedupeBooks(books);
  if (unique.length !== books.length) {
    await writeLibrary(unique);
  }
  return unique;
}

function assertUniqueTitleAuthor(books, book, ignoreId) {
  const key = makeTitleAuthorKey(book);
  if (!key) return;
  const conflict = books.find((item) => makeTitleAuthorKey(item) === key && String(item.id) !== String(ignoreId));
  if (conflict) {
    throw new Error('同一作者的同一本书只能保存一次');
  }
}

function sortBooks(data, sortBy = 'title', order = 'asc') {
  const field = SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'title';
  const multiplier = order === 'desc' ? -1 : 1;
  const sorted = [...data];
  sorted.sort((a, b) => {
    const va = a[field];
    const vb = b[field];
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * multiplier;
    }
    return String(va ?? '').localeCompare(String(vb ?? ''), 'zh') * multiplier;
  });
  return sorted;
}

async function listBooks(options = {}) {
  const books = await loadUniqueBooks();
  const { field, keyword, mode, sortBy, order } = options;
  let filtered = books.map((b) => ({
    ...b,
    publishYear: b.publishYear || b.published || '',
  }));

  if (keyword) {
    const targetField = field || 'title';
    const lowerKeyword = String(keyword).toLowerCase();
    filtered = filtered.filter((b) => {
      const val = String(b[targetField] || '').toLowerCase();
      if (mode === 'exact') return val === lowerKeyword;
      return val.includes(lowerKeyword);
    });
  }
  const sorted = sortBooks(filtered, sortBy, order);
  return sorted;
}

async function paginateBooks({ page = 1, pageSize = 5, field, keyword, mode, sortBy, order } = {}) {
  const filtered = await listBooks({ field, keyword, mode, sortBy, order });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return { total, items, data: items, page, pageSize };
}

async function addBook(payload) {
  const book = normalizeForSave(payload);
  const error = validateBook(book);
  if (error) throw new Error(error);

  const books = await loadUniqueBooks();
  if (books.some((b) => String(b.id) === String(book.id))) {
    throw new Error('书号已存在');
  }
  assertUniqueTitleAuthor(books, book);
  books.push(book);
  await writeLibrary(books);
  return book;
}

async function updateBook(id, payload) {
  const books = await loadUniqueBooks();
  const idx = books.findIndex((b) => String(b.id) === String(id));
  if (idx === -1) throw new Error('未找到对应书籍');

  const updated = { ...books[idx], ...payload, id };
  const sanitized = normalizeForSave(updated);
  const error = validateBook(sanitized);
  if (error) throw new Error(error);
  assertUniqueTitleAuthor(books, sanitized, id);

  books[idx] = sanitized;
  await writeLibrary(books);
  return sanitized;
}

async function deleteBook(id) {
  const books = await loadUniqueBooks();
  const idx = books.findIndex((b) => String(b.id) === String(id));
  if (idx === -1) throw new Error('未找到对应书籍');
  const removed = books.splice(idx, 1)[0];
  await writeLibrary(books);
  return removed;
}

async function getBook(id) {
  const books = await loadUniqueBooks();
  return books.find((b) => String(b.id) === String(id));
}

async function getRawXml() {
  return readXmlRaw();
}

module.exports = {
  listBooks,
  paginateBooks,
  addBook,
  updateBook,
  deleteBook,
  getBook,
  getRawXml,
};
