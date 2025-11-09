require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const { verifySocketToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

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

  Message.find().sort({ createdAt: 1 }).limit(50)
    .then(msgs => socket.emit('chat:history', msgs));

  socket.on('message', async (data) => {
    const msg = await Message.create({
      text: data.text,
      username: user.username,
      user: user._id,
    });
    io.emit('message', msg);
  });

  socket.on('disconnect', () => {
    io.emit('user:left', { username: user.username });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));

app.get("/", (req, res) => {
  res.send(" Server is running successfully!");
});
