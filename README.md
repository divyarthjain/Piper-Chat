# Piper-Chat

A real-time peer-to-peer group chat application for local networks. Share text messages and images with anyone on your LAN.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![Socket.io](https://img.shields.io/badge/Socket.io-4.7-black)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **Real-time messaging** - Instant message delivery via WebSocket
- **Image sharing** - Upload and share images (up to 10MB)
- **Typing indicators** - See when others are typing
- **User presence** - Online users list with colored avatars
- **Join/Leave notifications** - Know when users enter or leave
- **Responsive design** - Works on desktop and mobile
- **LAN access** - Share with anyone on your local network

## Quick Start

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Piper-Chat.git
cd Piper-Chat

# Install dependencies
npm install

# Start the app (runs both server and client)
npm run dev
```

Open **http://localhost:5173** in your browser.

## Inviting Others on Your Network

When you run `npm run dev`, the terminal shows your network URL:

```
➜  Network: http://192.168.x.x:5173/
```

Share this URL with others on your local network. They can join from any device (phone, tablet, other computers).

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Backend | Express.js |
| Real-time | Socket.io |
| File uploads | Multer |

## Project Structure

```
Piper-Chat/
├── server/
│   └── index.js          # Express + Socket.io server
├── src/
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # React entry point
│   ├── index.css         # Global styles
│   └── components/
│       ├── JoinScreen.jsx    # Username entry
│       ├── ChatRoom.jsx      # Main chat interface
│       ├── MessageList.jsx   # Message container
│       ├── Message.jsx       # Individual message
│       ├── UserList.jsx      # Online users sidebar
│       └── ImageUpload.jsx   # Image upload button
├── public/
│   └── uploads/          # Uploaded images (auto-created)
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both server and client (development) |
| `npm run server` | Start only the backend server |
| `npm run client` | Start only the Vite dev server |
| `npm run build` | Build for production |
| `npm start` | Run production server |

## Configuration

### Ports

- **Client**: 5173 (Vite default)
- **Server**: 3001

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |

## Image Uploads

- Supported formats: JPEG, PNG, GIF, WebP
- Maximum size: 10MB
- Images stored in `public/uploads/`
- Click on images to view full size

## License

MIT
