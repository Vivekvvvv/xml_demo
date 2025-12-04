const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/books.xml');

function parseBooksFromXml(xml) {
  const books = [];
  const bookRegex = /<book\s+id="([^"]+)">([\s\S]*?)<\/book>/gi;
  let bookMatch;
  while ((bookMatch = bookRegex.exec(xml))) {
    const id = bookMatch[1].trim();
    const body = bookMatch[2];
    const pick = (tag) => {
      const reg = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const m = reg.exec(body);
      return m ? m[1].trim() : '';
    };
    const book = {
      id,
      title: pick('title'),
      author: pick('author'),
      category: pick('category'),
      price: parseFloat(pick('price') || '0'),
      publishYear: pick('publishYear'),
      stock: parseInt(pick('stock') || '0', 10),
    };
    books.push(book);
  }
  return books;
}

function buildXmlFromBooks(books) {
  const items = books
    .map((b) => {
      return (
        `  <book id="${b.id}">\n` +
        `    <title>${b.title}</title>\n` +
        `    <author>${b.author}</author>\n` +
        `    <category>${b.category}</category>\n` +
        `    <price>${Number(b.price).toFixed(1)}</price>\n` +
        `    <publishYear>${b.publishYear}</publishYear>\n` +
        `    <stock>${Number.isInteger(b.stock) ? b.stock : 0}</stock>\n` +
        `  </book>`
      );
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<library xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="books.xsd">\n${items}\n</library>\n`;
}

async function readXmlRaw() {
  return fs.readFile(DATA_PATH, 'utf-8');
}

async function loadBooks() {
  const xml = await readXmlRaw();
  return parseBooksFromXml(xml);
}

async function saveBooks(books) {
  const xml = buildXmlFromBooks(books);
  await fs.writeFile(DATA_PATH, xml, 'utf-8');
  return xml;
}

module.exports = {
  loadBooks,
  saveBooks,
  readXmlRaw,
  parseBooksFromXml,
  buildXmlFromBooks,
};
