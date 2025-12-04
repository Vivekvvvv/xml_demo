const http = require('http');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { URL } = require('url');
const bookService = require('./service/bookService');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '../public');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(payload));
}

function sendXml(res, statusCode, xml) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(xml);
}

function sendText(res, statusCode, text, contentType = 'text/plain') {
  res.writeHead(statusCode, {
    'Content-Type': `${contentType}; charset=utf-8`,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(text);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('请求体过大');
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const text = buffer.toString('utf-8');
  if (text && req.headers['content-type']?.includes('application/json')) {
    return JSON.parse(text);
  }
  return text;
}

async function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  filePath = path.normalize(filePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, 'Forbidden');
    return;
  }
  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => sendText(res, 500, '读取文件出错'));
    const ext = path.extname(filePath);
    const typeMap = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.xsl': 'application/xml',
      '.xml': 'application/xml',
    };
    res.writeHead(200, { 'Content-Type': `${typeMap[ext] || 'text/plain'}; charset=utf-8` });
    stream.pipe(res);
  } catch (err) {
    sendText(res, 404, 'Not Found');
  }
}

async function handleApi(req, res, urlObj) {
  const { pathname, searchParams } = urlObj;

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return true;
  }

  if (pathname === '/api/books' && req.method === 'GET') {
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 5);
    const sortBy = searchParams.get('sortBy') || 'title';
    const order = searchParams.get('order') || 'asc';
    const result = await bookService.listBooks({ page, pageSize, sortBy, order });
    sendJson(res, 200, result);
    return true;
  }

  if (pathname === '/api/books/raw' && req.method === 'GET') {
    const xml = await bookService.rawXml();
    sendXml(res, 200, xml);
    return true;
  }

  if (pathname === '/api/books/xpath' && req.method === 'GET') {
    const expr = searchParams.get('expr') || '';
    const snippet = await bookService.queryByXPath(expr);
    sendXml(res, 200, snippet);
    return true;
  }

  if (pathname === '/api/books' && req.method === 'POST') {
    const body = await readBody(req);
    const created = await bookService.addBook(body);
    sendJson(res, 201, created);
    return true;
  }

  const idMatch = /^\/api\/books\/([^/]+)$/.exec(pathname);
  if (idMatch && req.method === 'PUT') {
    const id = idMatch[1];
    const body = await readBody(req);
    const updated = await bookService.updateBook(id, body);
    sendJson(res, 200, updated);
    return true;
  }

  if (idMatch && req.method === 'DELETE') {
    const id = idMatch[1];
    await bookService.deleteBook(id);
    sendJson(res, 200, { message: 'deleted' });
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    if (urlObj.pathname.startsWith('/api/')) {
      const handled = await handleApi(req, res, urlObj);
      if (!handled) {
        sendText(res, 404, 'API Not Found');
      }
      return;
    }
    await serveStatic(req, res, urlObj.pathname);
  } catch (err) {
    console.error('Server error', err);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
