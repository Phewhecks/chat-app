const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get current user
router.get('/me', authMiddleware, (req, res) => res.json(req.user));

// Update user
router.put('/me', authMiddleware, async (req, res) => {
  const { username, password } = req.body;
  if (username) req.user.username = username;
  if (password) req.user.passwordHash = await bcrypt.hash(password, 10);
  await req.user.save();
  res.json(req.user);
});

// Delete user
router.delete('/me', authMiddleware, async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  res.json({ message: 'User deleted' });
});

module.exports = router;

