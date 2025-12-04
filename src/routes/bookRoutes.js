const path = require('path');
const express = require('express');
const {
  paginateBooks,
  addBook,
  updateBook,
  deleteBook,
  getBook,
  listBooks,
  getRawXml,
  queryByXPath,
} = require('../services/bookService');
const { dataFile } = require('../dataAccess/xmlStore');
const { requireAuth } = require('../services/authService');

const router = express.Router();

router.use(requireAuth);

router.get('/books', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 5;
    const { field, keyword, mode, sortBy, order } = req.query;
    const result = await paginateBooks({ page, pageSize, field, keyword, mode, sortBy, order });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/books/search', async (req, res) => {
  try {
    const { field, keyword, mode } = req.query;
    const result = await listBooks({ field, keyword, mode });
    res.json({ total: result.length, data: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/books/:id', async (req, res) => {
  try {
    const book = await getBook(req.params.id);
    if (!book) return res.status(404).json({ message: '未找到书籍' });
    res.json(book);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/books', async (req, res) => {
  try {
    const created = await addBook(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/books/:id', async (req, res) => {
  try {
    const updated = await updateBook(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/books/:id', async (req, res) => {
  try {
    const removed = await deleteBook(req.params.id);
    res.json(removed);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/books/raw', async (req, res) => {
  try {
    const xml = await getRawXml();
    res.type('application/xml').send(xml);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get('/books/xpath', async (req, res) => {
  try {
    const snippet = await queryByXPath(req.query.expr || '');
    res.type('application/xml').send(snippet);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get('/books-xml', async (req, res) => {
  res.sendFile(dataFile);
});

router.get('/books-xsd', async (req, res) => {
  const xsdPath = path.join(__dirname, '../../data/books.xsd');
  res.sendFile(xsdPath);
});

module.exports = router;
