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

const users = new Map();
const messages = [];
const MAX_MESSAGES = 100;

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
    
    io.emit('message', msg);
  });

  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.broadcast.emit('typing', { user: user.username, isTyping });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
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
