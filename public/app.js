const qs = (id) => document.getElementById(id);
const AUTH_TOKEN_KEY = 'authToken';
const DISPLAY_NAME_KEY = 'displayName';
let currentPage = 1;
let totalPages = 1;

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const resp = await fetch(url, { ...options, headers });
  if (resp.status === 401) {
    clearSession();
    window.location.href = '/login.html';
    throw new Error('未登录');
  }
  return resp;
}

function updatePagerButtons() {
  const prev = qs('btn-prev');
  const next = qs('btn-next');
  if (prev) prev.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= totalPages;
}

function getSortType(field) {
  return ['price', 'publishYear', 'stock'].includes(field) ? 'number' : 'text';
}

async function renderXmlToTable(xmlText, containerId, sortField, order) {
  const [xslText] = await Promise.all([fetch('books.xsl').then((r) => r.text())]);
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const xsl = parser.parseFromString(xslText, 'text/xml');
  const processor = new XSLTProcessor();
  processor.importStylesheet(xsl);
  if (sortField) {
    processor.setParameter(null, 'sortField', sortField);
    processor.setParameter(null, 'order', order || 'asc');
    processor.setParameter(null, 'sortType', getSortType(sortField));
  }
  const fragment = processor.transformToFragment(xml, document);
  const container = qs(containerId);
  container.innerHTML = '';
  container.appendChild(fragment);
}

async function loadXsltTable() {
  const sortField = qs('xslt-sort-field').value;
  const sortOrder = qs('xslt-sort-order').value;
  const xmlText = await apiFetch('/api/books/raw').then((r) => r.text());
  await renderXmlToTable(xmlText, 'xslt-table', sortField, sortOrder);
}

async function loadPaged(page = 1) {
  const pageSize = Number(qs('page-size').value) || 5;
  const sortBy = qs('page-sort-field').value;
  const order = qs('page-sort-order').value;
  const resp = await apiFetch(`/api/books?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&order=${order}`);
  const data = await resp.json();
  const requestedPage = Number(page) || 1;
  const computedTotalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const safePage = Math.min(requestedPage, computedTotalPages);
  if (safePage !== data.page) {
    return loadPaged(safePage);
  }
  currentPage = data.page;
  totalPages = computedTotalPages;
  updatePagerButtons();
  qs('page-info').textContent = `第 ${currentPage} / ${totalPages} 页，共 ${data.total} 条`;
  const hasRows = Array.isArray(data.items) && data.items.length > 0;
  const rows = hasRows
    ? data.items
        .map(
          (b) =>
            `<tr><td>${b.id}</td><td>${b.title}</td><td>${b.author}</td><td>${b.category}</td><td>${b.price}</td><td>${b.publishYear}</td><td>${b.stock}</td></tr>`,
        )
        .join('')
    : '<tr><td class="empty-row" colspan="7">暂无数据</td></tr>';
  qs('paged-table').innerHTML = `<table class="table"><thead><tr><th>书号</th><th>书名</th><th>作者</th><th>分类</th><th>价格</th><th>年份</th><th>库存</th></tr></thead><tbody>${rows}</tbody></table>`;
  return null;
}

function readForm() {
  return {
    id: qs('form-id').value.trim(),
    title: qs('form-title').value.trim(),
    author: qs('form-author').value.trim(),
    category: qs('form-category').value.trim(),
    price: qs('form-price').value,
    publishYear: qs('form-year').value,
    stock: qs('form-stock').value,
  };
}

function setStatus(text, ok = false) {
  const node = qs('form-status');
  node.textContent = text;
  node.className = `status ${text ? (ok ? 'ok' : 'err') : ''}`;
}

async function handleAdd() {
  try {
    const payload = readForm();
    const resp = await apiFetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(await resp.text());
    setStatus('添加成功', true);
    await Promise.all([loadXsltTable(), loadPaged(currentPage)]);
  } catch (err) {
    setStatus(err.message);
  }
}

async function handleUpdate() {
  try {
    const payload = readForm();
    if (!payload.id) throw new Error('请先输入书号');
    const resp = await apiFetch(`/api/books/${encodeURIComponent(payload.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(await resp.text());
    setStatus('更新成功', true);
    await Promise.all([loadXsltTable(), loadPaged(currentPage)]);
  } catch (err) {
    setStatus(err.message);
  }
}

async function handleDelete() {
  try {
    const id = qs('form-id').value.trim();
    if (!id) throw new Error('请输入要删除的书号');
    const resp = await apiFetch(`/api/books/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error(await resp.text());
    setStatus('删除成功', true);
    await Promise.all([loadXsltTable(), loadPaged(currentPage)]);
  } catch (err) {
    setStatus(err.message);
  }
}

async function handleXPath() {
  try {
    const expr = qs('xpath-input').value.trim();
    const resp = await apiFetch(`/api/books/xpath?expr=${encodeURIComponent(expr)}`);
    if (!resp.ok) throw new Error(await resp.text());
    const xml = await resp.text();
    await renderXmlToTable(xml, 'xpath-result', 'title', 'asc');
  } catch (err) {
    const container = qs('xpath-result');
    if (container) container.textContent = `XPath 查询失败：${err.message}`;
  }
}

async function ensureSession() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    throw new Error('需要先登录');
  }
  const res = await apiFetch('/api/me');
  const data = await res.json();
  const name = data?.user?.displayName || data?.user?.username || '已登录';
  localStorage.setItem(DISPLAY_NAME_KEY, name);
  const userEl = qs('user-name');
  if (userEl) userEl.textContent = name;
}

async function handleLogout() {
  try {
    await apiFetch('/api/logout', { method: 'POST' });
  } catch (err) {
    console.warn('logout failed', err);
  } finally {
    clearSession();
    window.location.href = '/login.html';
  }
}

function bindEvents() {
  qs('btn-xslt-refresh').addEventListener('click', loadXsltTable);
  qs('btn-prev').addEventListener('click', () => {
    if (currentPage <= 1) return;
    loadPaged(currentPage - 1);
  });
  qs('btn-next').addEventListener('click', () => {
    if (currentPage >= totalPages) return;
    loadPaged(currentPage + 1);
  });
  qs('btn-add').addEventListener('click', handleAdd);
  qs('btn-update').addEventListener('click', handleUpdate);
  qs('btn-delete').addEventListener('click', handleDelete);
  qs('btn-xpath').addEventListener('click', handleXPath);
  qs('page-size').addEventListener('change', () => {
    currentPage = 1;
    loadPaged(1);
  });
  ['page-sort-field', 'page-sort-order'].forEach((id) => {
    qs(id).addEventListener('change', () => {
      currentPage = 1;
      loadPaged(1);
    });
  });
  const logoutBtn = qs('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await ensureSession();
    bindEvents();
    await loadXsltTable();
    await loadPaged(1);
    await handleXPath();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
});
