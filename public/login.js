function setStatus(text, ok) {
  const el = document.getElementById('login-status');
  el.textContent = text || '';
  el.className = `login-status ${ok ? 'ok' : text ? 'err' : ''}`;
}

function saveSession(token, user) {
  localStorage.setItem('authToken', token);
  if (user?.displayName) localStorage.setItem('displayName', user.displayName);
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
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  if (!username || !password) {
    setStatus('请输入账号和密码');
    return;
  }
  setStatus('正在登录...');
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).message || '登录失败';
      setStatus(msg);
      return;
    }
    const data = await res.json();
    saveSession(data.token, data.user);
    setStatus('登录成功，跳转中...', true);
    setTimeout(() => {
      window.location.href = '/';
    }, 300);
  } catch (err) {
    setStatus(err.message || '网络错误');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  tryRedirectIfAuthed().catch(() => {});
});
