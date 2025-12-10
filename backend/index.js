require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const { authMiddleware, verifySocketToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const onlineUsers = new Set();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Stats Route
app.get('/api/stats', async (_, res) => {
  const User = require('./models/User');
  const users = await User.countDocuments();
  const chats = await Message.countDocuments();
  res.json({ users, chats });
});

// Delete chat history (protected)
app.delete('/api/messages', authMiddleware, async (req, res) => {
  const { confirm } = req.body;
  if (!confirm) {
    return res.status(400).json({ message: 'Confirm deletion by sending { confirm: true } in the request body.' });
  }

  try {
    await Message.deleteMany({});
    // notify all connected clients so they can clear their UI
    io.emit('history:deleted');
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting messages', err);
    res.status(500).json({ message: 'Failed to delete messages' });
  }
});

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log(' MongoDB connected'))
  .catch(err => console.log('MongoDB Error:', err));

// Socket.IO Authentication
io.use(async (socket, next) => {
  try {
    await verifySocketToken(socket);
    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
});

// Socket.IO Events
io.on('connection', (socket) => {
  const user = socket.user;
  console.log(`${user.username} connected`);
  io.emit('user:join', { username: user.username });

  //  broadcast current online list
  onlineUsers.add(user.username);
  io.emit('online:update', { users: Array.from(onlineUsers) });

  // NOTE: NO chat shown history automatically on connect.
  //  call 'get:history' if want to load previous messages.

  // Robust message save with error logging and sender notification
  socket.on('message', async (data) => {
    try {
      const msg = await Message.create({
        text: data?.text || '',
        username: user.username,
        user: user._id,
      });
      io.emit('message', msg);
    } catch (err) {
      console.error('Failed to create message', err);
      socket.emit('message:error', { message: 'Failed to save message' });
    }
  });

  // On-demand history for the requesting socket
  socket.on('get:history', async (opts = {}) => {
    try {
      const limit = Math.min(200, opts.limit || 50);
      const msgs = await Message.find().sort({ createdAt: 1 }).limit(limit);
      socket.emit('chat:history', msgs);
    } catch (err) {
      console.error('get:history error', err);
      socket.emit('chat:history', []);
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    // expected payload: { typing: true|false }
    socket.broadcast.emit('user:typing', {
      username: user.username,
      typing: !!(data && data.typing)
    });
  });

  socket.on('disconnect', () => {
    io.emit('user:left', { username: user.username });
    // remove user from online set 
    onlineUsers.delete(user.username);
    io.emit('online:update', { users: Array.from(onlineUsers) });
    // ensure others stop showing this user as typing
    socket.broadcast.emit('user:typing', { username: user.username, typing: false });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));

app.get("/", (req, res) => {
  res.send(" Server is running successfully!");
});