const qs = (id) => document.getElementById(id);
const AUTH_TOKEN_KEY = 'authToken';
const DISPLAY_NAME_KEY = 'displayName';
const USER_ROLE_KEY = 'userRole';
let currentPage = 1;
let totalPages = 1;
let formMode = null;
let isAdminUser = false;
let currentUsername = '';
let adminPanelVisible = false;

const FORM_FIELDS = {
  id: 'form-id',
  title: 'form-title',
  author: 'form-author',
  category: 'form-category',
  price: 'form-price',
  publishYear: 'form-year',
  stock: 'form-stock',
};

const TABLE_COLUMNS = [
  { key: 'id', label: '书号' },
  { key: 'title', label: '书名' },
  { key: 'author', label: '作者' },
  { key: 'category', label: '分类' },
  { key: 'price', label: '价格' },
  { key: 'publishYear', label: '年份' },
  { key: 'stock', label: '库存' },
];

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
}

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
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

async function loadPaged(page = 1) {
  const pageSize = Number(qs('page-size').value) || 5;
  const sortBy = qs('page-sort-field').value;
  const order = qs('page-sort-order').value;
  const keyword = (qs('search-keyword')?.value || '').trim();
  const field = qs('search-field')?.value || 'title';
  const mode = qs('search-mode')?.value || 'contains';
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    sortBy,
    order,
  });
  if (keyword) {
    params.set('keyword', keyword);
    params.set('field', field);
    params.set('mode', mode);
  }
  const resp = await apiFetch(`/api/books?${params.toString()}`);
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
    await loadPaged(currentPage);
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
    await loadPaged(currentPage);
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
    await loadPaged(currentPage);
  } catch (err) {
    setStatus(err.message);
  }
}

function setAdminStatus(text, ok = false) {
  const node = qs('user-panel-status');
  if (!node) return;
  node.textContent = text || '';
  node.className = `status ${text ? (ok ? 'ok' : 'err') : ''}`;
}

function renderUserTable(users = []) {
  const container = qs('user-table');
  if (!container) return;
  if (!users.length) {
    container.innerHTML = '<table class="table"><tbody><tr><td class="empty-row">暂无用户</td></tr></tbody></table>';
    return;
  }
  const rows = users
    .map((user) => {
      const isSelf = user.username === currentUsername;
      const toggleText = user.role === 'admin' ? '降为普通' : '设为管理员';
      const disableDelete = isSelf ? 'disabled' : '';
      return `<tr data-username="${escapeHtml(user.username)}" data-role="${escapeHtml(user.role)}">
        <td>${escapeHtml(user.username)}</td>
        <td>${escapeHtml(user.displayName || user.username)}</td>
        <td>${user.role === 'admin' ? '管理员' : '普通用户'}</td>
        <td class="row-actions">
          <button type="button" class="ghost" data-user-action="reset">重置密码</button>
          <button type="button" class="ghost" data-user-action="toggle">${toggleText}</button>
          <button type="button" class="ghost danger" data-user-action="delete" ${disableDelete}>删除</button>
        </td>
      </tr>`;
    })
    .join('');
  container.innerHTML = `<table class="table"><thead><tr><th>账号</th><th>昵称</th><th>角色</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function loadUserTable() {
  if (!isAdminUser) return;
  setAdminStatus('正在加载...');
  try {
    const resp = await apiFetch('/api/users');
    if (!resp.ok) throw new Error(await resp.text());
    const data = await resp.json();
    renderUserTable(data.users || []);
    setAdminStatus(`共 ${data.users?.length || 0} 个账号`, true);
  } catch (err) {
    setAdminStatus(err.message || '加载失败');
  }
}

async function adminPatchUser(username, payload, successMessage) {
  try {
    const resp = await apiFetch(`/api/users/${encodeURIComponent(username)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(await resp.text());
    setAdminStatus(successMessage, true);
    await loadUserTable();
  } catch (err) {
    setAdminStatus(err.message || '操作失败');
  }
}

async function adminDeleteUser(username) {
  try {
    const resp = await apiFetch(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error(await resp.text());
    setAdminStatus('删除成功', true);
    await loadUserTable();
  } catch (err) {
    setAdminStatus(err.message || '删除失败');
  }
}

function handleUserTableClick(event) {
  const button = event.target.closest('[data-user-action]');
  if (!button) return;
  const row = button.closest('tr');
  if (!row) return;
  const username = row.dataset.username;
  const action = button.dataset.userAction;
  if (!username) return;
  if (action === 'delete' && username === currentUsername) {
    setAdminStatus('不能删除当前登录账号');
    return;
  }
  if (action === 'reset') {
    const newPass = window.prompt(`请输入 ${username} 的新密码`);
    if (!newPass) return;
    adminPatchUser(username, { password: newPass }, '密码已重置');
  } else if (action === 'toggle') {
    const newRole = row.dataset.role === 'admin' ? 'user' : 'admin';
    adminPatchUser(username, { role: newRole }, '角色已更新');
  } else if (action === 'delete') {
    if (!window.confirm(`确认删除账号 ${username} 吗？`)) return;
    adminDeleteUser(username);
  }
}

function toggleAdminPanel(visible) {
  const panel = qs('admin-panel');
  if (!panel) return;
  adminPanelVisible = !!visible && isAdminUser;
  panel.hidden = !adminPanelVisible;
  if (adminPanelVisible) {
    loadUserTable();
    const button = qs('btn-manage-users');
    if (button) button.textContent = '收起管理';
  } else {
    const container = qs('user-table');
    if (container) container.innerHTML = '';
    setAdminStatus('');
    const button = qs('btn-manage-users');
    if (button) button.textContent = '管理账号';
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
      openBookModal('update', book);
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

function openBookModal(mode, book = null) {
  const modal = qs('book-modal');
  if (!modal) return;
  modal.classList.add('active');
  document.body.classList.add('modal-open');
  setFormMode(mode, book);
}

function closeBookModal() {
  const modal = qs('book-modal');
  if (!modal) return;
  modal.classList.remove('active');
  document.body.classList.remove('modal-open');
  setFormMode(null);
  setStatus('');
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
  closeBookModal();
}

async function ensureSession() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    throw new Error('需要先登录');
  }
  const res = await apiFetch('/api/me');
  const data = await res.json();
  const user = data?.user || {};
  currentUsername = user.username || '';
  isAdminUser = user.role === 'admin' || user.username === 'admin';
  if (user.role) {
    localStorage.setItem(USER_ROLE_KEY, user.role);
  }
  const name = user.displayName || user.username || '已登录';
  localStorage.setItem(DISPLAY_NAME_KEY, name);
  const userEl = qs('user-name');
  if (userEl) userEl.textContent = name;
  toggleAdminPanel(adminPanelVisible && isAdminUser);
  const manageBtn = qs('btn-manage-users');
  if (manageBtn) {
    manageBtn.hidden = !isAdminUser;
    manageBtn.textContent = adminPanelVisible && isAdminUser ? '收起管理' : '管理账号';
  }
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
      openBookModal('create');
    });
  }
  const saveBtn = qs('btn-save');
  if (saveBtn) saveBtn.addEventListener('click', handleFormSave);
  const cancelBtn = qs('btn-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', handleCancelForm);
  const tableContainer = qs('paged-table');
  if (tableContainer) tableContainer.addEventListener('click', handlePagedTableClick);
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
  const searchBtn = qs('btn-search');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      currentPage = 1;
      loadPaged(1);
    });
  }
  const resetBtn = qs('btn-reset-search');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const keyword = qs('search-keyword');
      if (keyword) keyword.value = '';
      const fieldSel = qs('search-field');
      if (fieldSel) fieldSel.value = 'title';
      const modeSel = qs('search-mode');
      if (modeSel) modeSel.value = 'contains';
      currentPage = 1;
      loadPaged(1);
    });
  }
  const modalClose = qs('modal-close');
  if (modalClose) modalClose.addEventListener('click', closeBookModal);
  const modalBackdrop = document.querySelector('[data-close-modal]');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeBookModal);
  }
  const logoutBtn = qs('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  const manageBtn = qs('btn-manage-users');
  if (manageBtn) {
    manageBtn.addEventListener('click', () => {
      const nextVisible = !adminPanelVisible;
      toggleAdminPanel(nextVisible);
      if (nextVisible) {
        const panel = qs('admin-panel');
        if (panel) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }
  const userTable = qs('user-table');
  if (userTable) userTable.addEventListener('click', handleUserTableClick);
  const refreshUsers = qs('btn-user-refresh');
  if (refreshUsers) refreshUsers.addEventListener('click', loadUserTable);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await ensureSession();
    bindEvents();
    setFormMode(null);
    await loadPaged(1);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
});
