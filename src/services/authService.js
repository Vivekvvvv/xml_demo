const { v4: uuidv4 } = require('uuid');

const DEMO_USERS = [
  { username: 'admin', password: 'admin123', displayName: '管理员' },
  { username: 'guest', password: 'guest', displayName: '访客' },
];

const sessions = new Map();

function login(username, password) {
  const safeUser = String(username || '').trim();
  const safePass = String(password || '').trim();
  const user = DEMO_USERS.find((u) => u.username === safeUser && u.password === safePass);
  if (!user) return null;
  const token = uuidv4();
  const record = {
    token,
    user: { username: user.username, displayName: user.displayName || user.username },
    issuedAt: Date.now(),
  };
  sessions.set(token, record);
  return record;
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

module.exports = {
  login,
  verifyToken,
  logout,
  parseToken,
  requireAuth,
};
