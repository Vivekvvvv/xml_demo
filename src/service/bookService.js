const xmlStore = require('../data/xmlStore');

const SORTABLE_FIELDS = ['title', 'author', 'category', 'price', 'publishYear', 'stock'];

function validateBookPayload(book) {
  const required = ['id', 'title', 'author', 'category', 'price', 'publishYear', 'stock'];
  for (const key of required) {
    if (book[key] === undefined || book[key] === null || String(book[key]).trim() === '') {
      throw new Error(`字段 ${key} 不能为空`);
    }
  }
}

function normalizeBook(input) {
  return {
    id: String(input.id).trim(),
    title: String(input.title).trim(),
    author: String(input.author).trim(),
    category: String(input.category).trim(),
    price: Number(input.price),
    publishYear: String(input.publishYear).trim(),
    stock: Number.parseInt(input.stock, 10) || 0,
  };
}

async function listBooks({ page = 1, pageSize = 10, sortBy = 'title', order = 'asc' }) {
  const books = await xmlStore.loadBooks();
  const sortField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'title';
  const multiplier = order === 'desc' ? -1 : 1;
  books.sort((a, b) => {
    const va = a[sortField];
    const vb = b[sortField];
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * multiplier;
    }
    return String(va).localeCompare(String(vb), 'zh') * multiplier;
  });
  const total = books.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    total,
    page,
    pageSize,
    items: books.slice(start, end),
  };
}

async function addBook(raw) {
  const book = normalizeBook(raw);
  validateBookPayload(book);
  const books = await xmlStore.loadBooks();
  if (books.some((b) => b.id === book.id)) {
    throw new Error('书号已存在');
  }
  books.push(book);
  await xmlStore.saveBooks(books);
  return book;
}

async function updateBook(id, raw) {
  const books = await xmlStore.loadBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) {
    throw new Error('未找到要更新的书籍');
  }
  const merged = { ...books[idx], ...normalizeBook({ ...books[idx], ...raw, id }) };
  validateBookPayload(merged);
  books[idx] = merged;
  await xmlStore.saveBooks(books);
  return merged;
}

async function deleteBook(id) {
  const books = await xmlStore.loadBooks();
  const filtered = books.filter((b) => b.id !== id);
  if (filtered.length === books.length) {
    throw new Error('未找到要删除的书籍');
  }
  await xmlStore.saveBooks(filtered);
}

function buildXmlSnippet(books) {
  return xmlStore.buildXmlFromBooks(books);
}

// 轻量 XPath 解析：支持 //book[field="xxx"] 精确匹配，或 //book[contains(field,"kw")] 模糊
async function queryByXPath(expr) {
  const books = await xmlStore.loadBooks();
  if (!expr || typeof expr !== 'string') {
    return buildXmlSnippet(books);
  }

  const exact = /\/\/book\[(\w+)\s*=\s*"([^"]+)"\]/i.exec(expr);
  const contains = /\/\/book\[contains\((\w+),\s*"([^"]+)"\)\]/i.exec(expr);

  let filtered = books;

  if (exact) {
    const field = exact[1];
    const value = exact[2];
    filtered = books.filter((b) => String(b[field] ?? '').toLowerCase() === value.toLowerCase());
  } else if (contains) {
    const field = contains[1];
    const value = contains[2].toLowerCase();
    filtered = books.filter((b) => String(b[field] ?? '').toLowerCase().includes(value));
  }

  return buildXmlSnippet(filtered);
}

async function rawXml() {
  return xmlStore.readXmlRaw();
}

module.exports = {
  listBooks,
  addBook,
  updateBook,
  deleteBook,
  queryByXPath,
  rawXml,
};
