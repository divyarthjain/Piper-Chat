import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
const historyFile = path.join(dataDir, 'chat-history.json');
const channelsFile = path.join(dataDir, 'channels.json');
const webhooksFile = path.join(dataDir, 'webhooks.json');
const forumFile = path.join(dataDir, 'forum-topics.json');
const adminsFile = path.join(dataDir, 'admins.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadAdmins() {
  try {
    if (fs.existsSync(adminsFile)) {
      const data = fs.readFileSync(adminsFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load admins:', err.message);
  }
  return {};
}

function saveAdmins(admins) {
  try {
    fs.writeFileSync(adminsFile, JSON.stringify(admins, null, 2));
  } catch (err) {
    console.error('Failed to save admins:', err.message);
  }
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

function loadChannels() {
  try {
    if (fs.existsSync(channelsFile)) {
      const data = fs.readFileSync(channelsFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load channels:', err.message);
  }
  return ['general', 'random', 'dev'];
}

function saveChannels(chans) {
  try {
    fs.writeFileSync(channelsFile, JSON.stringify(chans, null, 2));
  } catch (err) {
    console.error('Failed to save channels:', err.message);
  }
}

function loadForumTopics() {
  try {
    if (fs.existsSync(forumFile)) {
      const data = fs.readFileSync(forumFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load forum topics:', err.message);
  }
  return [];
}

function saveForumTopics(topics) {
  try {
    fs.writeFileSync(forumFile, JSON.stringify(topics, null, 2));
  } catch (err) {
    console.error('Failed to save forum topics:', err.message);
  }
}

function loadWebhooks() {
  try {
    if (fs.existsSync(webhooksFile)) {
      const data = fs.readFileSync(webhooksFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load webhooks:', err.message);
  }
  return [];
}

function saveWebhooks(hooks) {
  try {
    fs.writeFileSync(webhooksFile, JSON.stringify(hooks, null, 2));
  } catch (err) {
    console.error('Failed to save webhooks:', err.message);
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
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.msi', '.dll'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Executable files are not allowed'));
    }
    
    cb(null, true);
  }
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const isImage = /jpeg|jpg|png|gif|webp/.test(path.extname(req.file.originalname).toLowerCase());

  res.json({ 
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    isImage
  });
});


const linkPreviewCache = new Map();

app.get('/api/preview', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (linkPreviewCache.has(url)) {
    return res.json(linkPreviewCache.get(url));
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0; +http://localhost)'
      }
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    const previewData = {
      title: title.substring(0, 100),
      description: description.substring(0, 200),
      image,
      domain,
      url
    };

    if (linkPreviewCache.size >= 100) {
      const firstKey = linkPreviewCache.keys().next().value;
      linkPreviewCache.delete(firstKey);
    }
    linkPreviewCache.set(url, previewData);

    res.json(previewData);
  } catch (error) {
    console.error('Link preview error:', error.message);
    res.status(500).json({ error: 'Failed to fetch preview' });
  }
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

// Webhook API endpoints
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'piper-webhook-secret';

app.get('/api/webhooks/info', (req, res) => {
  res.json({
    endpoint: '/api/webhooks/:source',
    headers: { 'X-Webhook-Secret': 'your-secret', 'Content-Type': 'application/json' },
    githubEvents: ['push', 'pull_request', 'issues'],
    genericFormat: { text: 'Message content', username: 'Bot Name', icon: '🤖' }
  });
});

app.post('/api/webhooks/:source', (req, res) => {
  const { source } = req.params;
  const secret = req.headers['x-webhook-secret'];
  
  if (secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }
  
  let botMessage = '';
  let icon = '🤖';
  
  // GitHub webhook
  if (req.headers['x-github-event']) {
    const event = req.headers['x-github-event'];
    const payload = req.body;
    
    switch (event) {
      case 'push':
        const commits = payload.commits?.length || 0;
        const branch = payload.ref?.replace('refs/heads/', '') || 'unknown';
        botMessage = `🔨 **${payload.pusher?.name}** pushed ${commits} commit(s) to \`${branch}\``;
        icon = '🔨';
        break;
      case 'pull_request':
        const action = payload.action;
        botMessage = `🔀 **${payload.sender?.login}** ${action} PR #${payload.number}: ${payload.pull_request?.title}`;
        icon = '🔀';
        break;
      case 'issues':
        botMessage = `📋 **${payload.sender?.login}** ${payload.action} issue #${payload.issue?.number}: ${payload.issue?.title}`;
        icon = '📋';
        break;
      default:
        botMessage = `📡 GitHub event: ${event}`;
    }
  } else {
    // Generic webhook format
    const { text, username: botName, icon: customIcon } = req.body;
    botMessage = text || 'Webhook received';
    icon = customIcon || '🤖';
  }
  
  const msg = {
    id: uuidv4(),
    type: 'bot',
    content: botMessage,
    user: { username: source || 'Webhook', color: '#6366F1' },
    icon,
    timestamp: new Date(),
    reactions: []
  };
  
  messages.push(msg);
  if (messages.length > 500) messages.shift();
  saveMessages(messages);
  io.emit('message', msg);
  
  res.json({ success: true, messageId: msg.id });
});

const users = new Map();
const messages = loadMessages();
const forumTopics = loadForumTopics();
const webhooks = loadWebhooks();
let admins = loadAdmins();
const mutedUsers = new Map();
const MAX_MESSAGES = 500;
const voiceUsers = new Map();
let currentScreenSharer = null;

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join', (username) => {
    let role = 'member';
    if (Object.keys(admins).length === 0) {
      role = 'admin';
      admins[username] = 'admin';
      saveAdmins(admins);
    } else if (admins[username]) {
      role = admins[username];
    }

    const user = {
      id: socket.id,
      username,
      color: getRandomColor(),
      status: 'available',
      customStatus: '',
      role,
      joinedAt: new Date()
    };
    users.set(socket.id, user);
    socket.join('general');
    
    socket.emit('history', messages);
    socket.emit('channels', channels);
    socket.emit('forum-topics', forumTopics);
    io.emit('users', Array.from(users.values()));
  });

  socket.on('join-channel', (channelId) => {
    // Leave all previous rooms except their own socket.id
    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }
    socket.join(channelId);
  });

  socket.on('set-role', ({ targetUsername, newRole }) => {
    const user = users.get(socket.id);
    if (!user || user.role !== 'admin') return;

    if (!['admin', 'moderator', 'member'].includes(newRole)) return;
    
    if (user.username === targetUsername && newRole !== 'admin') {
       const adminCount = Object.values(admins).filter(r => r === 'admin').length;
       if (adminCount <= 1) return;
    }

    admins[targetUsername] = newRole;
    if (newRole === 'member') delete admins[targetUsername];
    saveAdmins(admins);

    for (const [id, u] of users.entries()) {
      if (u.username === targetUsername) {
        u.role = newRole;
        io.to(id).emit('role-updated', newRole);
      }
    }
    io.emit('users', Array.from(users.values()));
  });

  socket.on('kick-user', (targetUsername) => {
    const user = users.get(socket.id);
    if (!user || !['admin', 'moderator'].includes(user.role)) return;

    const targetRole = admins[targetUsername] || 'member';
    if (user.role === 'moderator' && (targetRole === 'admin' || targetRole === 'moderator')) return;

    for (const [id, u] of users.entries()) {
      if (u.username === targetUsername) {
        io.to(id).emit('kicked');
        io.sockets.sockets.get(id)?.disconnect();
      }
    }
  });

  socket.on('mute-user', ({ targetUsername, durationMinutes }) => {
    const user = users.get(socket.id);
    if (!user || !['admin', 'moderator'].includes(user.role)) return;

    const targetRole = admins[targetUsername] || 'member';
    if (user.role === 'moderator' && (targetRole === 'admin' || targetRole === 'moderator')) return;

    const expiry = Date.now() + durationMinutes * 60 * 1000;
    mutedUsers.set(targetUsername, expiry);
    
    for (const [id, u] of users.entries()) {
      if (u.username === targetUsername) {
        io.to(id).emit('muted', { duration: durationMinutes, expiry });
      }
    }
  });

  socket.on('delete-message', (messageId) => {
    const user = users.get(socket.id);
    if (!user) return;

    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const msg = messages[msgIndex];
    const isOwn = msg.user.username === user.username;
    const canDelete = isOwn || ['admin', 'moderator'].includes(user.role);

    if (canDelete) {
      messages.splice(msgIndex, 1);
      saveMessages(messages);
      io.emit('history', messages);
    }
  });

  socket.on('edit-message', ({ messageId, newContent }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const msg = messages.find(m => m.id === messageId);
    if (msg && msg.user.username === user.username && msg.type === 'text') {
      msg.content = newContent;
      msg.edited = true;
      saveMessages(messages);
      io.emit('message-updated', msg);
    }
  });

  socket.on('message', (content, parentId = null, channelId = 'chat') => {
    const user = users.get(socket.id);
    if (!user) return;

    const muteExpiry = mutedUsers.get(user.username);
    if (muteExpiry) {
      if (muteExpiry > Date.now()) {
        socket.emit('system-message', 'You are muted and cannot send messages.');
        return;
      } else {
        mutedUsers.delete(user.username);
      }
    }

    const msg = {
      id: uuidv4(),
      type: 'text',
      content,
      parentId,
      channelId,
      replies: [],
      user: { id: user.id, username: user.username, color: user.color, role: user.role },
      timestamp: new Date(),
      reactions: []
    };
    
    if (parentId) {
      const parent = messages.find(m => m.id === parentId);
      if (parent) {
        if (!parent.replies) parent.replies = [];
        parent.replies.push(msg.id);
        io.emit('message-updated', parent);
      }
    }
    
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();
    saveMessages(messages);
    
    io.to(channelId).emit('message', msg);
  });

  socket.on('image', (imageUrl, channelId = 'chat') => {
    const user = users.get(socket.id);
    if (!user) return;

    const muteExpiry = mutedUsers.get(user.username);
    if (muteExpiry) {
      if (muteExpiry > Date.now()) {
        socket.emit('system-message', 'You are muted and cannot send messages.');
        return;
      } else {
        mutedUsers.delete(user.username);
      }
    }

    const msg = {
      id: uuidv4(),
      type: 'image',
      content: imageUrl,
      channelId,
      user: { id: user.id, username: user.username, color: user.color, role: user.role },
      timestamp: new Date(),
      reactions: []
    };
    
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();
    saveMessages(messages);
    
    io.to(channelId).emit('message', msg);
  });

  socket.on('file', (fileData, channelId = 'chat') => {
    const user = users.get(socket.id);
    if (!user) return;

    const muteExpiry = mutedUsers.get(user.username);
    if (muteExpiry) {
      if (muteExpiry > Date.now()) {
        socket.emit('system-message', 'You are muted and cannot send messages.');
        return;
      } else {
        mutedUsers.delete(user.username);
      }
    }

    const msg = {
      id: uuidv4(),
      type: 'file',
      content: fileData, // { url, filename, originalName, size, mimetype }
      channelId,
      user: { id: user.id, username: user.username, color: user.color, role: user.role },
      timestamp: new Date(),
      reactions: []
    };
    
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();
    saveMessages(messages);
    
    io.to(channelId).emit('message', msg);
  });

  socket.on('add-reaction', ({ messageId, emoji }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = [];
      const existingReaction = msg.reactions.find(r => r.emoji === emoji);
      
      if (existingReaction) {
        if (!existingReaction.users.includes(user.username)) {
          existingReaction.users.push(user.username);
        }
      } else {
        msg.reactions.push({ emoji, users: [user.username] });
      }
      
      saveMessages(messages);
      io.emit('message-updated', msg);
    }
  });

  socket.on('remove-reaction', ({ messageId, emoji }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const msg = messages.find(m => m.id === messageId);
    if (msg && msg.reactions) {
      const reaction = msg.reactions.find(r => r.emoji === emoji);
      if (reaction) {
        reaction.users = reaction.users.filter(u => u !== user.username);
        if (reaction.users.length === 0) {
          msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
        }
        saveMessages(messages);
        io.emit('message-updated', msg);
      }
    }
  });

  socket.on('typing', ({ isTyping, channelId = 'general' }) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.to(channelId).emit('typing', { user: user.username, isTyping, channelId });
  });

  socket.on('set-status', ({ status, customStatus }) => {
    const user = users.get(socket.id);
    if (!user) return;

    user.status = status;
    user.customStatus = customStatus;
    io.emit('users', Array.from(users.values()));
  });

  socket.on('create-channel', (channelName) => {
    const user = users.get(socket.id);
    if (!user) return;

    if (!channelName || channelName.length > 20 || channels.includes(channelName)) return;

    channels.push(channelName);
    saveChannels(channels);
    io.emit('channels', channels);

    const msg = {
      id: uuidv4(),
      type: 'system',
      content: `${user.username} created channel #${channelName}`,
      channelId: 'general',
      timestamp: new Date(),
      reactions: []
    };
    messages.push(msg);
    saveMessages(messages);
    io.emit('message', msg);
  });

  socket.on('message', ({ content, parentId = null, channelId = 'general' }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const muteExpiry = mutedUsers.get(user.username);
    if (muteExpiry) {
      if (muteExpiry > Date.now()) {
        socket.emit('system-message', 'You are muted and cannot send messages.');
        return;
      } else {
        mutedUsers.delete(user.username);
      }
    }

    const msg = {
      id: uuidv4(),
      type: 'text',
      content,
      parentId,
      channelId,
      replies: [],
      user: { id: user.id, username: user.username, color: user.color, role: user.role },
      timestamp: new Date(),
      reactions: []
    };
    
    if (parentId) {
      const parent = messages.find(m => m.id === parentId);
      if (parent) {
        if (!parent.replies) parent.replies = [];
        parent.replies.push(msg.id);
        io.emit('message-updated', parent);
      }
    }
    
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();
    saveMessages(messages);
    
    io.to(channelId).emit('message', msg);
  });

  socket.on('image', ({ imageUrl, channelId = 'general' }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const muteExpiry = mutedUsers.get(user.username);
    if (muteExpiry) {
      if (muteExpiry > Date.now()) {
        socket.emit('system-message', 'You are muted and cannot send messages.');
        return;
      } else {
        mutedUsers.delete(user.username);
      }
    }

    const msg = {
      id: uuidv4(),
      type: 'image',
      content: imageUrl,
      channelId,
      user: { id: user.id, username: user.username, color: user.color, role: user.role },
      timestamp: new Date(),
      reactions: []
    };
    
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();
    saveMessages(messages);
    
    io.to(channelId).emit('message', msg);
  });

  socket.on('file', ({ fileData, channelId = 'general' }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const muteExpiry = mutedUsers.get(user.username);
    if (muteExpiry) {
      if (muteExpiry > Date.now()) {
        socket.emit('system-message', 'You are muted and cannot send messages.');
        return;
      } else {
        mutedUsers.delete(user.username);
      }
    }

    const msg = {
      id: uuidv4(),
      type: 'file',
      content: fileData,
      channelId,
      user: { id: user.id, username: user.username, color: user.color, role: user.role },
      timestamp: new Date(),
      reactions: []
    };
    
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();
    saveMessages(messages);
    
    io.to(channelId).emit('message', msg);
  });

  socket.on('forum-create-topic', ({ title, body, tags }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const topic = {
      id: uuidv4(),
      title,
      body,
      author: user.username,
      authorColor: user.color,
      tags: tags || [],
      createdAt: new Date(),
      replies: [],
      resolved: false
    };

    forumTopics.unshift(topic);
    saveForumTopics(forumTopics);
    io.emit('forum-topics', forumTopics);
  });

  socket.on('forum-reply', ({ topicId, body }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const topic = forumTopics.find(t => t.id === topicId);
    if (topic) {
      const reply = {
        id: uuidv4(),
        body,
        author: user.username,
        authorColor: user.color,
        createdAt: new Date()
      };
      
      topic.replies.push(reply);
      saveForumTopics(forumTopics);
      io.emit('forum-topics', forumTopics);
    }
  });

  socket.on('forum-resolve', ({ topicId }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const topic = forumTopics.find(t => t.id === topicId);
    if (topic) {
      if (topic.author === user.username) {
        topic.resolved = !topic.resolved;
        saveForumTopics(forumTopics);
        io.emit('forum-topics', forumTopics);
      }
    }
  });

  socket.on('screen-share-start', (streamId) => {
    if (currentScreenSharer) return;
    currentScreenSharer = socket.id;
    io.emit('screen-share-started', { oderId: socket.id, username: users.get(socket.id)?.username, streamId });
  });

  socket.on('screen-share-stop', () => {
    if (currentScreenSharer === socket.id) {
      currentScreenSharer = null;
      io.emit('screen-share-stopped', socket.id);
    }
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
    if (currentScreenSharer === socket.id) {
      currentScreenSharer = null;
      io.emit('screen-share-stopped', socket.id);
    }

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
