const fs = require('fs/promises');
const path = require('path');

const dataFile = path.join(__dirname, '../../data/users.json');
const DEFAULT_USERS = [
  { username: 'admin', password: 'admin123', displayName: '管理员', role: 'admin' },
  { username: 'guest', password: 'guest', displayName: '游客', role: 'user' },
];

async function ensureFile() {
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
  }
}

function normalizeUser(raw = {}) {
  const username = String(raw.username || '').trim();
  if (!username) return null;
  const password = typeof raw.password === 'string' ? raw.password : String(raw.password ?? '');
  const displayName = String(raw.displayName || username);
  const role = raw.role === 'admin' ? 'admin' : 'user';
  return { username, password, displayName, role };
}

function toPublicUser(raw = {}) {
  if (!raw || !raw.username) return null;
  const { password, ...rest } = raw;
  return rest;
}

async function readUsers() {
  await ensureFile();
  const text = await fs.readFile(dataFile, 'utf-8');
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeUser).filter(Boolean);
    }
  } catch {
    // ignore corrupt file
  }
  await fs.writeFile(dataFile, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
  return [...DEFAULT_USERS];
}

async function writeUsers(users = []) {
  const normalized = users.map(normalizeUser).filter(Boolean);
  await fs.writeFile(dataFile, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

async function findUser(username) {
  const list = await readUsers();
  return list.find((user) => user.username === username) || null;
}

async function addUser(payload = {}) {
  const incoming = normalizeUser(payload);
  if (!incoming || !incoming.password) {
    throw new Error('用户名和密码不能为空');
  }
  const list = await readUsers();
  if (list.some((u) => u.username === incoming.username)) {
    throw new Error('用户名已存在');
  }
  list.push(incoming);
  await writeUsers(list);
  return incoming;
}

async function updateUser(username, changes = {}) {
  const list = await readUsers();
  const index = list.findIndex((u) => u.username === username);
  if (index === -1) throw new Error('用户不存在');
  const merged = normalizeUser({ ...list[index], ...changes, username });
  list[index] = merged;
  await writeUsers(list);
  return merged;
}

async function deleteUser(username) {
  const list = await readUsers();
  const index = list.findIndex((u) => u.username === username);
  if (index === -1) throw new Error('用户不存在');
  list.splice(index, 1);
  await writeUsers(list);
}

async function listUsers() {
  const list = await readUsers();
  return list.map(toPublicUser).filter(Boolean);
}

module.exports = {
  addUser,
  updateUser,
  deleteUser,
  findUser,
  listUsers,
  toPublicUser,
};
