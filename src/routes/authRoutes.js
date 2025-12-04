const express = require('express');
const { login, verifyToken, logout, parseToken } = require('../services/authService');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const session = login(username, password);
  if (!session) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  return res.json({ token: session.token, user: session.user });
});

router.get('/me', (req, res) => {
  const token = parseToken(req);
  const session = verifyToken(token);
  if (!session) {
    return res.status(401).json({ message: '未登录' });
  }
  return res.json({ user: session.user });
});

router.post('/logout', (req, res) => {
  const token = parseToken(req);
  if (token) logout(token);
  res.json({ ok: true });
});

module.exports = router;
