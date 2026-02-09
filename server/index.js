import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
const historyFile = path.join(dataDir, 'chat-history.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadMessages() {
  try {
    if (fs.existsSync(historyFile)) {
      const data = fs.readFileSync(historyFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load chat history:', err.message);
  }
  return [];
}

function saveMessages(msgs) {
  try {
    fs.writeFileSync(historyFile, JSON.stringify(msgs, null, 2));
  } catch (err) {
    console.error('Failed to save chat history:', err.message);
  }
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 10e6
});

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ 
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

app.get('/api/history/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="piper-chat-history-${Date.now()}.json"`);
  res.json({
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages
  });
});

app.post('/api/history/import', (req, res) => {
  try {
    const { messages: importedMessages } = req.body;
    
    if (!Array.isArray(importedMessages)) {
      return res.status(400).json({ error: 'Invalid format: messages must be an array' });
    }
    
    const validMessages = importedMessages.filter(msg => 
      msg.id && msg.type && msg.content && msg.timestamp
    );
    
    messages.length = 0;
    messages.push(...validMessages.slice(-MAX_MESSAGES));
    saveMessages(messages);
    
    io.emit('history', messages);
    
    res.json({ 
      success: true, 
      imported: validMessages.length,
      message: `Imported ${validMessages.length} messages`
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to import: ' + err.message });
  }
});

app.delete('/api/history', (req, res) => {
  messages.length = 0;
  saveMessages(messages);
  io.emit('history', messages);
  res.json({ success: true, message: 'Chat history cleared' });
});

const users = new Map();
const messages = loadMessages();
const MAX_MESSAGES = 500;
const voiceUsers = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join', (username) => {
    const user = {
      id: socket.id,
      username,
      color: getRandomColor(),
      joinedAt: new Date()
    };
    users.set(socket.id, user);
    
    socket.emit('history', messages);
    io.emit('users', Array.from(users.values()));
    socket.emit('voice-users', Array.from(voiceUsers.values()));
    
    const joinMsg = {
      id: uuidv4(),
      type: 'system',
      content: `${username} joined the chat`,
      timestamp: new Date()
    };
    messages.push(joinMsg);
    io.emit('message', joinMsg);
  });

  socket.on('message', (content) => {
    const user = users.get(socket.id);
    if (!user) return;

    const msg = {
      id: uuidv4(),
      type: 'text',
      content,
      user: { id: user.id, username: user.username, color: user.color },
      timestamp: new Date()
    };
    
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();
    saveMessages(messages);
    
    io.emit('message', msg);
  });

  socket.on('image', (imageUrl) => {
    const user = users.get(socket.id);
    if (!user) return;

    const msg = {
      id: uuidv4(),
      type: 'image',
      content: imageUrl,
      user: { id: user.id, username: user.username, color: user.color },
      timestamp: new Date()
    };
    
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();
    saveMessages(messages);
    
    io.emit('message', msg);
  });

  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.broadcast.emit('typing', { user: user.username, isTyping });
  });

  socket.on('voice-join', () => {
    const user = users.get(socket.id);
    if (!user) return;
    
    const voiceUser = {
      id: socket.id,
      username: user.username,
      color: user.color,
      muted: false,
      deafened: false
    };
    voiceUsers.set(socket.id, voiceUser);
    
    socket.to(Array.from(voiceUsers.keys()).filter(id => id !== socket.id))
      .emit('voice-user-joined', voiceUser);
    
    io.emit('voice-users', Array.from(voiceUsers.values()));
    console.log(`${user.username} joined voice channel`);
  });

  socket.on('voice-leave', () => {
    const user = users.get(socket.id);
    if (voiceUsers.has(socket.id)) {
      voiceUsers.delete(socket.id);
      io.emit('voice-users', Array.from(voiceUsers.values()));
      io.emit('voice-user-left', socket.id);
      console.log(`${user?.username} left voice channel`);
    }
  });

  socket.on('voice-signal', ({ to, signal }) => {
    io.to(to).emit('voice-signal', { from: socket.id, signal });
  });

  socket.on('voice-mute', (muted) => {
    const voiceUser = voiceUsers.get(socket.id);
    if (voiceUser) {
      voiceUser.muted = muted;
      io.emit('voice-users', Array.from(voiceUsers.values()));
    }
  });

  socket.on('voice-deafen', (deafened) => {
    const voiceUser = voiceUsers.get(socket.id);
    if (voiceUser) {
      voiceUser.deafened = deafened;
      voiceUser.muted = deafened ? true : voiceUser.muted;
      io.emit('voice-users', Array.from(voiceUsers.values()));
    }
  });

  socket.on('voice-speaking', (speaking) => {
    socket.broadcast.emit('voice-speaking', { oderId: socket.id, speaking });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    
    if (voiceUsers.has(socket.id)) {
      voiceUsers.delete(socket.id);
      io.emit('voice-users', Array.from(voiceUsers.values()));
      io.emit('voice-user-left', socket.id);
    }
    
    if (user) {
      const leaveMsg = {
        id: uuidv4(),
        type: 'system',
        content: `${user.username} left the chat`,
        timestamp: new Date()
      };
      messages.push(leaveMsg);
      io.emit('message', leaveMsg);
      
      users.delete(socket.id);
      io.emit('users', Array.from(users.values()));
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

function getRandomColor() {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
});
