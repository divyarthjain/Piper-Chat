import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import UserList from './UserList';
import FileUpload from './FileUpload';
import HistoryControls from './HistoryControls';
import VoiceChannel from './VoiceChannel';
import SearchBar from './SearchBar';
import ForumChannel from './ForumChannel';
import SlashCommands from './SlashCommands';

function ChatRoom({ socket, username, messages, forumTopics, users, typingUsers, onSendMessage, onSendImage, onTyping }) {
  const [activeChannel, setActiveChannel] = useState('chat');
  const [input, setInput] = useState('');
  const [showUsers, setShowUsers] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [localMessages, setLocalMessages] = useState(null);
  const typingTimeout = useRef(null);

  const displayMessages = localMessages !== null ? localMessages : messages;

  const executeSlashCommand = (cmd, args) => {
    switch (cmd.name) {
      case 'help':
        const helpMsg = {
          id: 'help-' + Date.now(),
          type: 'system',
          content: 'Commands: /help, /clear, /users, /me [action], /shrug, /tableflip, /unflip, /lenny',
          timestamp: new Date()
        };
        setLocalMessages([...(localMessages || messages), helpMsg]);
        break;
      case 'clear':
        setLocalMessages([]);
        break;
      case 'users':
        const userList = users.map(u => u.username).join(', ');
        const usersMsg = {
          id: 'users-' + Date.now(),
          type: 'system',
          content: `Online: ${userList}`,
          timestamp: new Date()
        };
        setLocalMessages([...(localMessages || messages), usersMsg]);
        break;
      case 'me':
        if (args) onSendMessage(`*${username} ${args}*`);
        break;
      case 'shrug':
        onSendMessage('¯\\_(ツ)_/¯');
        break;
      case 'tableflip':
        onSendMessage('(╯°□°)╯︵ ┻━┻');
        break;
      case 'unflip':
        onSendMessage('┬─┬ノ( º _ ºノ)');
        break;
      case 'lenny':
        onSendMessage('( ͡° ͜ʖ ͡°)');
        break;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      if (input.startsWith('/')) {
        const parts = input.slice(1).split(' ');
        const cmdName = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');
        const cmd = { name: cmdName };
        executeSlashCommand(cmd, args);
      } else {
        onSendMessage(input.trim());
      }
      setInput('');
      setShowSlashCommands(false);
      onTyping(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    setShowSlashCommands(value.startsWith('/') && value.length > 0);
    onTyping(true);

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(() => {
      onTyping(false);
    }, 1000);
  };

  const handleFile = (fileData) => {
    // If it's an image, send as image message for backward compatibility/inline display
    if (fileData.mimetype?.startsWith('image/')) {
      onSendImage(fileData.url);
    } else {
      // Otherwise emit as file message
      socket.emit('file', fileData);
    }
  };

  const filteredTypingUsers = typingUsers.filter((u) => u !== username);
  
  const currentUserRole = users.find(u => u.username === username)?.role || 'member';

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
            <div className="hidden sm:block">
              <h1 className="text-white font-semibold">Piper Chat</h1>
              <p className="text-white/50 text-sm">{users.length} online</p>
            </div>
          </div>

          <div className="flex-1 flex justify-center px-4">
            <div className="bg-white/10 rounded-xl p-1 flex">
              <button 
                onClick={() => setActiveChannel('chat')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeChannel === 'chat' ? 'bg-white/20 text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                Chat
              </button>
              <button 
                onClick={() => setActiveChannel('forum')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeChannel === 'forum' ? 'bg-white/20 text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                Forum
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeChannel === 'chat' && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (!showSearch) setHighlightedMessageId(null);
                    setShowSearch(!showSearch);
                  }}
                  className="p-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                  title="Search messages"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                {showSearch && (
                  <SearchBar 
                    messages={messages} 
                    onResultClick={(id) => {
                      setHighlightedMessageId(id);
                      setShowSearch(false);
                    }}
                    onClose={() => setShowSearch(false)}
                  />
                )}
              </div>
            )}
            
            <button
              onClick={() => setShowUsers(!showUsers)}
              className="lg:hidden p-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </button>

            {activeChannel === 'chat' && <HistoryControls />}
          </div>
        </div>

        {activeChannel === 'chat' ? (
          <>
            <MessageList 
              messages={displayMessages} 
              currentUser={username} 
              currentUserRole={currentUserRole}
              socket={socket}
              highlightedMessageId={highlightedMessageId}
            />

            {filteredTypingUsers.length > 0 && (
              <div className="px-4 py-2 text-white/50 text-sm">
                {filteredTypingUsers.length === 1
                  ? `${filteredTypingUsers[0]} is typing...`
                  : `${filteredTypingUsers.length} people are typing...`}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 relative">
              {showSlashCommands && (
                <SlashCommands 
                  input={input}
                  onSelect={(cmd) => {
                    if (cmd.name === 'me') {
                      setInput('/me ');
                    } else {
                      executeSlashCommand(cmd, '');
                      setInput('');
                    }
                    setShowSlashCommands(false);
                  }}
                  onClose={() => setShowSlashCommands(false)}
                />
              )}
              <div className="flex gap-2">
                <FileUpload onUpload={handleFile} />

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
          </>
        ) : (
          <ForumChannel socket={socket} username={username} topics={forumTopics} />
        )}
      </div>

      <div className={`${showUsers ? 'block' : 'hidden'} lg:block lg:w-72 space-y-4`}>
        <VoiceChannel socket={socket} currentUser={username} />
        <UserList users={users} currentUser={username} socket={socket} />
      </div>
    </div>
  );
}

export default ChatRoom;
