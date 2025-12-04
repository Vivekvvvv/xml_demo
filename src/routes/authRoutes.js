const express = require('express');
const {
  login,
  registerUser,
  verifyToken,
  logout,
  parseToken,
  requireAuth,
  requireAdmin,
  listAllUsers,
  updateUserAccount,
  deleteUserAccount,
} = require('../services/authService');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const session = await login(username, password);
    if (!session) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    return res.json({ token: session.token, user: session.user });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body || {};
    const user = await registerUser({ username, password, displayName });
    return res.status(201).json({ user });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', (req, res) => {
  const token = parseToken(req);
  if (token) logout(token);
  res.json({ ok: true });
});

router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await listAllUsers();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/users/:username', requireAuth, requireAdmin, async (req, res) => {
  try {
    const updated = await updateUserAccount(req.params.username, req.body || {});
    res.json({ user: updated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/users/:username', requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteUserAccount(req.params.username);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
