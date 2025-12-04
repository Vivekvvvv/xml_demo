const state = {
  page: 1,
  pageSize: 5,
  field: '',
  keyword: '',
  mode: 'fuzzy',
};

const tableBody = document.getElementById('table-body');
const statusText = document.getElementById('status-text');
const pageInfo = document.getElementById('page-info');
const formStatus = document.getElementById('form-status');

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const msg = (await res.json().catch(() => ({}))).message || res.statusText;
    throw new Error(msg);
  }
  return res.json();
}

async function loadBooks() {
  statusText.textContent = '加载中...';
  const params = new URLSearchParams();
  params.append('page', state.page);
  params.append('pageSize', state.pageSize);
  if (state.keyword) {
    params.append('field', state.field);
    params.append('keyword', state.keyword);
    params.append('mode', state.mode);
  }
  const data = await fetchJSON(`/api/books?${params.toString()}`);
  renderTable(data.data);
  const totalPages = Math.max(1, Math.ceil(data.total / state.pageSize));
  pageInfo.textContent = `第 ${state.page} / ${totalPages} 页，共 ${data.total} 条`;
  statusText.textContent = data.total ? '加载完成' : '暂无数据';
}

function renderTable(rows) {
  tableBody.innerHTML = rows
    .map(
      (b) => `<tr>
        <td>${b.id || ''}</td>
        <td>${b.title || ''}</td>
        <td>${b.author || ''}</td>
        <td>${b.price || ''}</td>
        <td><span class="badge">${b.category || ''}</span></td>
        <td>${b.stock || ''}</td>
        <td>${b.published || ''}</td>
        <td>
          <button class="secondary" data-fill="${b.id}">填充</button>
        </td>
      </tr>`
    )
    .join('');

  document.querySelectorAll('button[data-fill]').forEach((btn) => {
    btn.addEventListener('click', () => fillForm(btn.dataset.fill));
  });
}

async function fillForm(id) {
  try {
    const data = await fetchJSON(`/api/books/${id}`);
    document.getElementById('form-id').value = data.id || '';
    document.getElementById('form-title').value = data.title || '';
    document.getElementById('form-author').value = data.author || '';
    document.getElementById('form-price').value = data.price || '';
    document.getElementById('form-category').value = data.category || '';
    document.getElementById('form-stock').value = data.stock || '';
    document.getElementById('form-published').value = data.published || '';
    formStatus.textContent = '表单已填充，可更新/删除';
  } catch (err) {
    formStatus.textContent = `读取失败: ${err.message}`;
  }
}

async function addBook() {
  const payload = collectForm();
  formStatus.textContent = '提交中...';
  try {
    await fetchJSON('/api/books', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    formStatus.textContent = '新增成功';
    await loadBooks();
  } catch (err) {
    formStatus.textContent = `新增失败：${err.message}`;
  }
}

async function updateBook() {
  const payload = collectForm();
  if (!payload.id) {
    formStatus.textContent = '更新需要提供书号';
    return;
  }
  formStatus.textContent = '更新中...';
  try {
    await fetchJSON(`/api/books/${payload.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    formStatus.textContent = '更新成功';
    await loadBooks();
  } catch (err) {
    formStatus.textContent = `更新失败：${err.message}`;
  }
}

async function deleteBook() {
  const id = document.getElementById('form-id').value.trim();
  if (!id) {
    formStatus.textContent = '删除需要提供书号';
    return;
  }
  formStatus.textContent = '删除中...';
  try {
    await fetchJSON(`/api/books/${id}`, { method: 'DELETE' });
    formStatus.textContent = '删除成功';
    await loadBooks();
  } catch (err) {
    formStatus.textContent = `删除失败：${err.message}`;
  }
}

function collectForm() {
  return {
    id: document.getElementById('form-id').value.trim(),
    title: document.getElementById('form-title').value.trim(),
    author: document.getElementById('form-author').value.trim(),
    price: document.getElementById('form-price').value,
    category: document.getElementById('form-category').value.trim(),
    stock: document.getElementById('form-stock').value,
    published: document.getElementById('form-published').value,
  };
}

async function loadXSLView() {
  const sortField = document.getElementById('sort-field').value || 'price';
  const xmlText = await fetch('/api/books-xml').then((r) => r.text());
  const xslText = await fetch('/books-table.xsl').then((r) => r.text());
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const xsl = parser.parseFromString(xslText, 'text/xml');
  const processor = new XSLTProcessor();
  processor.importStylesheet(xsl);
  processor.setParameter(null, 'sortField', sortField);
  const frag = processor.transformToFragment(xml, document);
  const container = document.getElementById('xsl-table');
  container.innerHTML = '';
  container.appendChild(frag);
}

document.getElementById('btn-search').addEventListener('click', () => {
  state.page = 1;
  state.field = document.getElementById('search-field').value;
  state.keyword = document.getElementById('search-keyword').value.trim();
  state.mode = document.getElementById('search-mode').value;
  state.pageSize = Number(document.getElementById('page-size').value) || 5;
  loadBooks().catch((err) => (statusText.textContent = `加载失败：${err.message}`));
});

document.getElementById('btn-reset').addEventListener('click', () => {
  document.getElementById('search-keyword').value = '';
  state.keyword = '';
  state.page = 1;
  loadBooks().catch((err) => (statusText.textContent = `加载失败：${err.message}`));
});

document.getElementById('prev-page').addEventListener('click', () => {
  if (state.page > 1) {
    state.page -= 1;
    loadBooks().catch((err) => (statusText.textContent = `加载失败：${err.message}`));
  }
});

document.getElementById('next-page').addEventListener('click', () => {
  state.page += 1;
  loadBooks().catch((err) => (statusText.textContent = `加载失败：${err.message}`));
});

document.getElementById('btn-add').addEventListener('click', addBook);
document.getElementById('btn-update').addEventListener('click', updateBook);
document.getElementById('btn-delete').addEventListener('click', deleteBook);
document.getElementById('btn-xsl').addEventListener('click', () => {
  loadXSLView().catch((err) => {
    document.getElementById('xsl-table').textContent = `XSLT 渲染失败：${err.message}`;
  });
});

// 初始加载
loadBooks().catch((err) => {
  statusText.textContent = `加载失败：${err.message}`;
});
loadXSLView().catch(() => {});
