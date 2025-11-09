const jwt = require('jsonwebtoken');
const User = require('../models/User');

const secret = process.env.JWT_SECRET;

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Missing token' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, secret);
    req.user = await User.findById(decoded.id);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

async function verifySocketToken(socket) {
  const token = socket.handshake.query?.token;
  const decoded = jwt.verify(token, secret);
  const user = await User.findById(decoded.id);
  socket.user = user;
}

module.exports = { authMiddleware, verifySocketToken };

