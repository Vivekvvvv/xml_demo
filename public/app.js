const qs = (id) => document.getElementById(id);
const AUTH_TOKEN_KEY = 'authToken';
const DISPLAY_NAME_KEY = 'displayName';
let currentPage = 1;
let totalPages = 1;
let formMode = null;

const FORM_FIELDS = {
  id: 'form-id',
  title: 'form-title',
  author: 'form-author',
  category: 'form-category',
  price: 'form-price',
  publishYear: 'form-year',
  stock: 'form-stock',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clearFormFields() {
  Object.values(FORM_FIELDS).forEach((fieldId) => {
    const node = qs(fieldId);
    if (node) node.value = '';
  });
}

function fillFormFields(book = {}) {
  Object.entries(FORM_FIELDS).forEach(([key, fieldId]) => {
    const node = qs(fieldId);
    if (node) node.value = book[key] ?? '';
  });
}

function focusFirstField() {
  const node = qs(FORM_FIELDS.id);
  if (node) node.focus();
}

function setFormMode(mode, book = null) {
  formMode = mode;
  const titleEl = qs('crud-card-title');
  const hintEl = qs('crud-card-hint');
  const saveBtn = qs('btn-save');
  if (!saveBtn) return;
  let titleText = '操作表单';
  let hintText = '点击“新增图书”或某一行的“更新”按钮后再填写';
  let saveText = '保存';
  let enableSave = false;

  if (mode === 'create') {
    clearFormFields();
    titleText = '新增图书';
    hintText = '填写完表单后点击“保存新增”';
    saveText = '保存新增';
    enableSave = true;
    focusFirstField();
  } else if (mode === 'update' && book) {
    fillFormFields(book);
    titleText = `更新：${book.title || book.id || ''}`;
    hintText = '修改内容后点击“保存修改”';
    saveText = '保存修改';
    enableSave = true;
    focusFirstField();
  } else {
    clearFormFields();
  }

  saveBtn.textContent = saveText;
  saveBtn.disabled = !enableSave;
  if (titleEl) titleEl.textContent = titleText;
  if (hintEl) hintEl.textContent = hintText;
  if (mode) {
    const card = qs('crud-card');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

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
        .map((b) => {
          const attrs = [
            `data-id="${escapeHtml(b.id ?? '')}"`,
            `data-title="${escapeHtml(b.title ?? '')}"`,
            `data-author="${escapeHtml(b.author ?? '')}"`,
            `data-category="${escapeHtml(b.category ?? '')}"`,
            `data-price="${escapeHtml(b.price ?? '')}"`,
            `data-year="${escapeHtml(b.publishYear ?? '')}"`,
            `data-stock="${escapeHtml(b.stock ?? '')}"`,
          ].join(' ');
          return `<tr ${attrs}>
            <td>${escapeHtml(b.id ?? '')}</td>
            <td>${escapeHtml(b.title ?? '')}</td>
            <td>${escapeHtml(b.author ?? '')}</td>
            <td>${escapeHtml(b.category ?? '')}</td>
            <td>${escapeHtml(b.price ?? '')}</td>
            <td>${escapeHtml(b.publishYear ?? '')}</td>
            <td>${escapeHtml(b.stock ?? '')}</td>
            <td class="row-actions">
              <button type="button" class="ghost btn-row-update" data-action="update">更新</button>
              <button type="button" class="ghost danger btn-row-delete" data-action="delete">删除</button>
            </td>
          </tr>`;
        })
        .join('')
    : '<tr><td class="empty-row" colspan="8">暂无数据</td></tr>';
  qs('paged-table').innerHTML = `<table class="table"><thead><tr><th>书号</th><th>书名</th><th>作者</th><th>分类</th><th>价格</th><th>年份</th><th>库存</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table>`;
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

function getBookFromRow(row) {
  if (!row || !row.dataset) return null;
  return {
    id: row.dataset.id || '',
    title: row.dataset.title || '',
    author: row.dataset.author || '',
    category: row.dataset.category || '',
    price: row.dataset.price || '',
    publishYear: row.dataset.year || '',
    stock: row.dataset.stock || '',
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
    if (formMode === 'create') {
      clearFormFields();
      focusFirstField();
    }
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

async function handleDelete(idOverride) {
  try {
    const id =
      typeof idOverride === 'string' && idOverride
        ? idOverride
        : qs('form-id').value.trim();
    if (!id) throw new Error('请输入要删除的书号');
    const resp = await apiFetch(`/api/books/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error(await resp.text());
    setStatus('删除成功', true);
    await Promise.all([loadXsltTable(), loadPaged(currentPage)]);
  } catch (err) {
    setStatus(err.message);
  }
}

function handlePagedTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const row = button.closest('tr');
  if (!row) return;
  const action = button.dataset.action;
  if (action === 'update') {
    const book = getBookFromRow(row);
    if (book) {
      setStatus('');
      setFormMode('update', book);
    }
  } else if (action === 'delete') {
    const id = row.dataset.id;
    if (!id) {
      setStatus('无法获取要删除的书号');
      return;
    }
    const name = row.dataset.title || id;
    if (!window.confirm(`确认删除《${name}》吗？`)) return;
    handleDelete(id);
  }
}

async function handleFormSave() {
  if (formMode === 'create') {
    await handleAdd();
  } else if (formMode === 'update') {
    await handleUpdate();
  } else {
    setStatus('请先选择新增或更新操作');
  }
}

function handleCancelForm() {
  setStatus('');
  setFormMode(null);
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
  const addBtn = qs('btn-add');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      setStatus('');
      setFormMode('create');
    });
  }
  const saveBtn = qs('btn-save');
  if (saveBtn) saveBtn.addEventListener('click', handleFormSave);
  const cancelBtn = qs('btn-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', handleCancelForm);
  const tableContainer = qs('paged-table');
  if (tableContainer) tableContainer.addEventListener('click', handlePagedTableClick);
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
    setFormMode(null);
    await loadXsltTable();
    await loadPaged(1);
    await handleXPath();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
});
