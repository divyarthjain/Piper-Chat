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
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    socket.on('history', (history) => {
      setMessages(history);
    });

    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
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

    return () => {
      socket.off('history');
      socket.off('message');
      socket.off('users');
      socket.off('typing');
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
      users={users}
      typingUsers={typingUsers}
      onSendMessage={handleSendMessage}
      onSendImage={handleSendImage}
      onTyping={handleTyping}
    />
  );
}

export default App;
