import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import UserList from './UserList';
import FileUpload from './FileUpload';
import HistoryControls from './HistoryControls';
import VoiceChannel from './VoiceChannel';
import SearchBar from './SearchBar';
import ForumChannel from './ForumChannel';
import SlashCommands from './SlashCommands';
import ChannelList from './ChannelList';

function ChatRoom({ socket, username, messages, forumTopics, users, channels, typingUsers, onSendMessage, onSendImage, onTyping, onCreateChannel, muted, onMuteToggle }) {
  const [activeChannel, setActiveChannel] = useState('general');
  const [input, setInput] = useState('');
  const [showUsers, setShowUsers] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [localMessages, setLocalMessages] = useState(null);
  const typingTimeout = useRef(null);
  const [openDMs, setOpenDMs] = useState([]);

  const getDmId = (user1, user2) => `dm-${[user1, user2].sort().join('-')}`;

  useEffect(() => {
    const dmUsers = new Set();
    messages.forEach(msg => {
      if (msg.channelId && msg.channelId.startsWith('dm-')) {
        const participants = msg.channelId.replace('dm-', '').split('-');
        const otherUser = participants.find(u => u !== username);
        if (otherUser) dmUsers.add(otherUser);
      }
    });
    setOpenDMs(prev => Array.from(new Set([...prev, ...dmUsers])));
  }, [messages, username]);

  const startDM = (targetUser) => {
    if (!openDMs.includes(targetUser)) {
      setOpenDMs(prev => [...prev, targetUser]);
    }
    setActiveChannel(getDmId(username, targetUser));
  };

  const displayMessages = (localMessages !== null ? localMessages : messages).filter(msg => {
    if (activeChannel === 'forum') return false;
    
    const msgChannelId = msg.channelId || 'general';
    const effectiveMsgChannelId = msgChannelId === 'chat' ? 'general' : msgChannelId;
    
    return effectiveMsgChannelId === activeChannel;
  });

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
        if (args) onSendMessage(`*${username} ${args}*`, null, activeChannel);
        break;
      case 'shrug':
        onSendMessage('¯\\_(ツ)_/¯', null, activeChannel);
        break;
      case 'tableflip':
        onSendMessage('(╯°□°)╯︵ ┻━┻', null, activeChannel);
        break;
      case 'unflip':
        onSendMessage('┬─┬ノ( º _ ºノ)', null, activeChannel);
        break;
      case 'lenny':
        onSendMessage('( ͡° ͜ʖ ͡°)', null, activeChannel);
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
        onSendMessage(input.trim(), null, activeChannel);
      }
      setInput('');
      setShowSlashCommands(false);
      onTyping(false, activeChannel);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    setShowSlashCommands(value.startsWith('/') && value.length > 0);
    onTyping(true, activeChannel);

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(() => {
      onTyping(false, activeChannel);
    }, 1000);
  };

  const handleFile = (fileData) => {
    // If it's an image, send as image message for backward compatibility/inline display
    if (fileData.mimetype?.startsWith('image/')) {
      onSendImage(fileData.url, activeChannel);
    } else {
      // Otherwise emit as file message
      socket.emit('file', fileData, activeChannel);
    }
  };

  const filteredTypingUsers = typingUsers
    .filter(u => u.username !== username && u.channelId === activeChannel)
    .map(u => u.username);
  
  const currentUserRole = users.find(u => u.username === username)?.role || 'member';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto">
      <div className="hidden lg:flex flex-col w-64 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-4 overflow-y-auto">
        <ChannelList 
          channels={channels} 
          activeChannel={activeChannel} 
          onSelectChannel={setActiveChannel}
          onCreateChannel={onCreateChannel}
        />
        
        <div className="border-t border-white/10 my-4"></div>
        
        <button 
          onClick={() => setActiveChannel('forum')}
          className={`text-left px-4 py-2 rounded-xl transition-all ${activeChannel === 'forum' ? 'bg-white/20 text-white font-medium shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
          # forum
        </button>

        <h2 className="text-white font-bold mt-8 mb-4 px-2 uppercase text-xs tracking-wider opacity-50">Direct Messages</h2>
        <div className="space-y-1">
          {openDMs.map(user => {
             const userObj = users.find(u => u.username === user);
             const statusColor = userObj ? 
               (userObj.status === 'available' ? 'bg-green-500' : 
                userObj.status === 'away' ? 'bg-yellow-500' : 
                userObj.status === 'busy' ? 'bg-red-500' : 'bg-gray-500') 
               : 'bg-gray-500';
             
             return (
              <button 
                key={user}
                onClick={() => setActiveChannel(getDmId(username, user))}
                className={`w-full text-left px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${activeChannel === getDmId(username, user) ? 'bg-white/20 text-white font-medium shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                <span className="truncate">{user}</span>
              </button>
            );
          })}
        </div>
      </div>



      <div className="flex-1 flex flex-col bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
              {activeChannel.startsWith('dm-') ? (
                 <span className="text-white font-bold">@</span>
              ) : (
                 <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                 </svg>
              )}
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-semibold">
                {activeChannel === 'chat' ? 'General Chat' : 
                 activeChannel === 'forum' ? 'Community Forum' : 
                 `@${activeChannel.replace('dm-', '').split('-').find(u => u !== username)}`}
              </h1>
              <p className="text-white/50 text-sm">
                {activeChannel === 'chat' ? `${users.length} online` : 
                 activeChannel === 'forum' ? `${forumTopics.length} topics` : 
                 'Direct Message'}
              </p>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-semibold">
                {activeChannel === 'chat' ? 'General Chat' : 
                 activeChannel === 'forum' ? 'Community Forum' : 
                 `@${activeChannel.replace('dm-', '').split('-').find(u => u !== username)}`}
              </h1>
              <p className="text-white/50 text-sm">
                {activeChannel === 'chat' ? `${users.length} online` : 
                 activeChannel === 'forum' ? `${forumTopics.length} topics` : 
                 'Direct Message'}
              </p>
            </div>
          </div>

          <div className="flex-1 flex justify-center px-4 lg:hidden">
             {/* Mobile Channel Switcher */}
             <select 
               value={activeChannel}
               onChange={(e) => setActiveChannel(e.target.value)}
               className="bg-white/10 text-white text-sm rounded-lg p-2 border border-white/20 focus:outline-none w-full"
             >
               <option value="chat" className="text-black"># general</option>
               <option value="forum" className="text-black"># forum</option>
               <optgroup label="Direct Messages" className="text-black">
                 {openDMs.map(user => (
                   <option key={user} value={getDmId(username, user)}>@{user}</option>
                 ))}
               </optgroup>
             </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMuteToggle}
              className="p-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
              title={muted ? "Unmute sounds" : "Mute sounds"}
            >
              {muted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            {activeChannel !== 'forum' && (
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

        {activeChannel === 'forum' ? (
          <ForumChannel socket={socket} username={username} topics={forumTopics} />
        ) : (
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
        )}
      </div>

      <div className={`${showUsers ? 'block' : 'hidden'} lg:block lg:w-72 space-y-4`}>
        <VoiceChannel socket={socket} currentUser={username} />
        <UserList users={users} currentUser={username} socket={socket} onStartDM={startDM} />
      </div>
    </div>
  );
}

export default ChatRoom;
