import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import JoinScreen from './components/JoinScreen';
import ChatRoom from './components/ChatRoom';

const SERVER_URL = `http://${window.location.hostname}:3001`;
const socket = io(SERVER_URL);

function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [forumTopics, setForumTopics] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    socket.on('history', (history) => {
      setMessages(history);
    });

    socket.on('forum-topics', (topics) => {
      setForumTopics(topics);
    });

    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('message-updated', (updatedMsg) => {
      setMessages((prev) => prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg));
    });

    socket.on('users', (userList) => {
      setUsers(userList);
    });

    socket.on('typing', ({ user, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(user) ? prev : [...prev, user];
        }
        return prev.filter((u) => u !== user);
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
    setUsername(name);
    socket.emit('join', name);
    setJoined(true);
  }, []);

  const handleSendMessage = useCallback((content) => {
    socket.emit('message', content);
  }, []);

  const handleSendImage = useCallback((imageUrl) => {
    socket.emit('image', imageUrl);
  }, []);

  const handleTyping = useCallback((isTyping) => {
    socket.emit('typing', isTyping);
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
      typingUsers={typingUsers}
      onSendMessage={handleSendMessage}
      onSendImage={handleSendImage}
      onTyping={handleTyping}
    />
  );
}

export default App;
