import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import JoinScreen from './components/JoinScreen';
import ChatRoom from './components/ChatRoom';
import { soundManager } from './utils/SoundManager';

const SERVER_URL = `http://${window.location.hostname}:3001`;
const socket = io(SERVER_URL);

function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [forumTopics, setForumTopics] = useState([]);
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    soundManager.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    socket.on('history', (history) => {
      setMessages(history);
    });

    socket.on('channels', (channelList) => {
      setChannels(channelList);
    });

    socket.on('forum-topics', (topics) => {
      setForumTopics(topics);
    });

    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);

      // Sound and Notification Logic
      if (document.hidden || (msg.user && msg.user.username !== username)) {
        if (msg.type === 'system') {
          if (msg.content.includes('joined')) {
            soundManager.playJoinSound();
          } else if (msg.content.includes('left')) {
            soundManager.playLeaveSound();
          }
        } else if (['text', 'image', 'file'].includes(msg.type)) {
          if (msg.user && msg.user.username !== username) {
            soundManager.playMessageSound();
            
            if (document.hidden && Notification.permission === 'granted') {
              new Notification(`New message from ${msg.user.username}`, {
                body: msg.type === 'text' ? msg.content : `Sent a ${msg.type}`,
                icon: '/vite.svg'
              });
            }
          }
        }
      }
    });

    socket.on('message-updated', (updatedMsg) => {
      setMessages((prev) => prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg));
    });

    socket.on('users', (userList) => {
      setUsers(userList);
    });

    socket.on('typing', ({ user, isTyping, channelId = 'chat' }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          if (prev.some(u => u.username === user && u.channelId === channelId)) return prev;
          return [...prev, { username: user, channelId }];
        }
        return prev.filter((u) => !(u.username === user && u.channelId === channelId));
      });
    });

    socket.on('kicked', () => {
      alert('You have been kicked from the chat.');
      window.location.reload();
    });

    socket.on('muted', ({ duration }) => {
      alert(`You have been muted for ${duration} minutes.`);
    });

    socket.on('system-message', (msg) => {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        type: 'system',
        content: msg,
        timestamp: new Date()
      }]);
    });

    socket.on('role-updated', (newRole) => {
      alert(`Your role has been updated to: ${newRole}`);
    });

    return () => {
      socket.off('history');
      socket.off('forum-topics');
      socket.off('message');
      socket.off('message-updated');
      socket.off('users');
      socket.off('typing');
      socket.off('kicked');
      socket.off('muted');
      socket.off('system-message');
      socket.off('role-updated');
    };
  }, []);

  const handleJoin = useCallback((name) => {
    soundManager.init(); // Initialize audio context on user gesture
    setUsername(name);
    socket.emit('join', name);
    setJoined(true);
  }, []);

  const handleSendMessage = useCallback((content, parentId, channelId = 'general') => {
    socket.emit('message', { content, parentId, channelId });
  }, []);

  const handleSendImage = useCallback((imageUrl, channelId = 'general') => {
    socket.emit('image', { imageUrl, channelId });
  }, []);

  const handleTyping = useCallback((isTyping, channelId = 'general') => {
    socket.emit('typing', { isTyping, channelId });
  }, []);

  const handleCreateChannel = useCallback((name) => {
    socket.emit('create-channel', name);
  }, []);

  if (!joined) {
    return <JoinScreen onJoin={handleJoin} />;
  }

  return (
    <ChatRoom
      socket={socket}
      username={username}
      messages={messages}
      forumTopics={forumTopics}
      users={users}
      channels={channels}
      typingUsers={typingUsers}
      onSendMessage={handleSendMessage}
      onSendImage={handleSendImage}
      onTyping={handleTyping}
      onCreateChannel={handleCreateChannel}
      muted={muted}
      onMuteToggle={() => setMuted(!muted)}
    />
  );
}

export default App;
