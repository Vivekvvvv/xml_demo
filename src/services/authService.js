const { v4: uuidv4 } = require('uuid');
const userStore = require('../dataAccess/userStore');

const sessions = new Map();

function normalizeCredentials(value) {
  return String(value || '').trim();
}

function refreshSessions(user) {
  if (!user || !user.username) return;
  const publicUser = userStore.toPublicUser(user);
  if (!publicUser) return;
  for (const record of sessions.values()) {
    if (record.user.username === publicUser.username) {
      record.user = { ...record.user, ...publicUser };
    }
  }
}

async function login(username, password) {
  const safeUser = normalizeCredentials(username);
  const safePass = normalizeCredentials(password);
  if (!safeUser || !safePass) return null;
  const user = await userStore.findUser(safeUser);
  if (!user || user.password !== safePass) return null;
  const token = uuidv4();
  const publicUser = userStore.toPublicUser(user);
  const record = {
    token,
    user: { ...publicUser },
    issuedAt: Date.now(),
  };
  sessions.set(token, record);
  return record;
}

async function registerUser({ username, password, displayName }) {
  const safeUser = normalizeCredentials(username);
  const safePass = normalizeCredentials(password);
  const safeDisplay = displayName ? String(displayName).trim() : safeUser;
  if (!safeUser || !safePass) {
    throw new Error('用户名和密码不能为空');
  }
  const created = await userStore.addUser({
    username: safeUser,
    password: safePass,
    displayName: safeDisplay,
    role: 'user',
  });
  return userStore.toPublicUser(created);
}

async function listAllUsers() {
  return userStore.listUsers();
}

async function updateUserAccount(username, payload = {}) {
  const safeUsername = normalizeCredentials(username);
  if (!safeUsername) throw new Error('用户名不能为空');
  const updates = { ...payload };
  if (updates.password !== undefined) {
    updates.password = normalizeCredentials(updates.password);
  }
  if (updates.displayName !== undefined) {
    updates.displayName = String(updates.displayName || safeUsername).trim();
  }
  if (updates.role && updates.role !== 'admin') {
    updates.role = 'user';
  }
  const updated = await userStore.updateUser(safeUsername, updates);
  refreshSessions(updated);
  return userStore.toPublicUser(updated);
}

async function deleteUserAccount(username) {
  const safeUsername = normalizeCredentials(username);
  await userStore.deleteUser(safeUsername);
  for (const [token, record] of sessions.entries()) {
    if (record.user.username === safeUsername) {
      sessions.delete(token);
    }
  }
}

function verifyToken(token) {
  if (!token) return null;
  return sessions.get(token) || null;
}

function logout(token) {
  if (!token) return;
  sessions.delete(token);
}

function parseToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = parseToken(req);
  const session = verifyToken(token);
  if (!session) {
    return res.status(401).json({ message: '未登录或会话已失效' });
  }
  req.user = session.user;
  req.token = token;
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '仅管理员可执行此操作' });
  }
  return next();
}

module.exports = {
  login,
  registerUser,
  listAllUsers,
  updateUserAccount,
  deleteUserAccount,
  verifyToken,
  logout,
  parseToken,
  requireAuth,
  requireAdmin,
};
