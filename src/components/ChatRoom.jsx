import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import UserList from './UserList';
import ImageUpload from './ImageUpload';
import HistoryControls from './HistoryControls';

function ChatRoom({ username, messages, users, typingUsers, onSendMessage, onSendImage, onTyping }) {
  const [input, setInput] = useState('');
  const [showUsers, setShowUsers] = useState(false);
  const typingTimeout = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
      onTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    onTyping(true);

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(() => {
      onTyping(false);
    }, 1000);
  };

  const handleImageUpload = (imageUrl) => {
    onSendImage(imageUrl);
  };

  const filteredTypingUsers = typingUsers.filter((u) => u !== username);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto">
      <div className="flex-1 flex flex-col bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-semibold">Local Chat</h1>
              <p className="text-white/50 text-sm">{users.length} online</p>
            </div>
          </div>

          <button
            onClick={() => setShowUsers(!showUsers)}
            className="lg:hidden p-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </button>

          <HistoryControls />
        </div>

        <MessageList messages={messages} currentUser={username} />

        {filteredTypingUsers.length > 0 && (
          <div className="px-4 py-2 text-white/50 text-sm">
            {filteredTypingUsers.length === 1
              ? `${filteredTypingUsers[0]} is typing...`
              : `${filteredTypingUsers.length} people are typing...`}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <ImageUpload onUpload={handleImageUpload} />

            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />

            <button
              type="submit"
              disabled={!input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      <div className={`${showUsers ? 'block' : 'hidden'} lg:block`}>
        <UserList users={users} currentUser={username} />
      </div>
    </div>
  );
}

export default ChatRoom;
