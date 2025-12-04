function setStatus(id, text, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || '';
  el.className = `login-status ${ok ? 'ok' : text ? 'err' : ''}`;
}

const USER_ROLE_KEY = 'userRole';

function saveSession(token, user) {
  localStorage.setItem('authToken', token);
  if (user?.displayName) localStorage.setItem('displayName', user.displayName);
  if (user?.role) localStorage.setItem(USER_ROLE_KEY, user.role);
}

async function tryRedirectIfAuthed() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) {
    window.location.href = '/';
  } else {
    localStorage.removeItem('authToken');
    localStorage.removeItem('displayName');
    localStorage.removeItem(USER_ROLE_KEY);
  }
}

function switchPane(target) {
  document.querySelectorAll('.auth-form').forEach((form) => {
    form.classList.toggle('active', form.id === `${target}-form`);
  });
  document.querySelectorAll('.auth-tabs .tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pane === target);
  });
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  if (!username || !password) {
    setStatus('login-status', '请输入账号和密码');
    return;
  }
  setStatus('login-status', '正在登录...');
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).message || '登录失败';
      setStatus('login-status', msg);
      return;
    }
    const data = await res.json();
    saveSession(data.token, data.user);
    setStatus('login-status', '登录成功，跳转中...', true);
    setTimeout(() => {
      window.location.href = '/';
    }, 300);
  } catch (err) {
    setStatus('login-status', err.message || '网络错误');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const displayName = document.getElementById('reg-display').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  if (!username || !password) {
    setStatus('register-status', '账号/密码不能为空');
    return;
  }
  if (password !== confirm) {
    setStatus('register-status', '两次密码不一致');
    return;
  }
  setStatus('register-status', '正在注册...');
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName }),
    });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).message || '注册失败';
      setStatus('register-status', msg);
      return;
    }
    setStatus('register-status', '注册成功，请登录', true);
    document.getElementById('username').value = username;
    document.getElementById('password').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-confirm').value = '';
    switchPane('login');
    document.getElementById('password').focus();
  } catch (err) {
    setStatus('register-status', err.message || '网络错误');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  document.querySelectorAll('.auth-tabs .tab').forEach((btn) => {
    btn.addEventListener('click', () => switchPane(btn.dataset.pane));
  });
  switchPane('login');
  tryRedirectIfAuthed().catch(() => {});
});
