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
import Heatmap from './Heatmap';

function ChatRoom({ socket, username, messages, forumTopics, users, channels, typingUsers, onSendMessage, onSendImage, onTyping, onCreateChannel, muted, onMuteToggle }) {
  const [activeChannel, setActiveChannel] = useState('general');
  const [input, setInput] = useState('');
  const [showUsers, setShowUsers] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [localMessages, setLocalMessages] = useState(null);
  const typingTimeout = useRef(null);
  const [openDMs, setOpenDMs] = useState([]);

  const getDmId = (user1, user2) => `dm-${[user1, user2].sort().join('-')}`;

  useEffect(() => {
    socket.emit('join-channel', 'general');
  }, [socket]);

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

  const handleChannelSelect = (channelId) => {
    if (activeChannel !== channelId) {
      socket.emit('join-channel', channelId);
      setActiveChannel(channelId);
      setShowSearch(false);
      setHighlightedMessageId(null);
    }
  };

  const startDM = (targetUser) => {
    if (!openDMs.includes(targetUser)) {
      setOpenDMs(prev => [...prev, targetUser]);
    }
    const dmId = getDmId(username, targetUser);
    handleChannelSelect(dmId);
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
    if (fileData.mimetype?.startsWith('image/')) {
      onSendImage(fileData.url, activeChannel);
    } else {
      socket.emit('file', fileData, activeChannel);
    }
  };

  const filteredTypingUsers = typingUsers
    .filter(u => u.username !== username && u.channelId === activeChannel)
    .map(u => u.username);
  
  const currentUserRole = users.find(u => u.username === username)?.role || 'member';

  return (
    <div className="h-screen w-full bg-github-bg text-github-text flex overflow-hidden font-sans selection:bg-github-accent selection:text-white">
      <div className="w-64 flex-shrink-0 bg-github-bg-secondary border-r border-github-border flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-github-border">
          <div className="font-semibold text-github-text truncate">
            {username}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
          <ChannelList 
            channels={channels} 
            activeChannel={activeChannel} 
            onSelectChannel={handleChannelSelect}
            onCreateChannel={onCreateChannel}
          />
          
          <div className="my-4 px-2">
            <div className="h-px bg-github-border opacity-50"></div>
          </div>
          
          <button 
            onClick={() => handleChannelSelect('forum')}
            className={`w-full text-left px-3 py-1.5 rounded-md mx-2 text-sm transition-all flex items-center gap-2 group mb-4 ${
              activeChannel === 'forum' 
                ? 'bg-github-accent/10 text-github-text font-medium relative before:absolute before:left-[-10px] before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-4 before:bg-github-accent before:rounded-r' 
                : 'text-github-text-secondary hover:text-github-text hover:bg-github-bg-secondary/50'
            }`}
          >
            <svg className={`w-4 h-4 ${activeChannel === 'forum' ? 'text-github-accent' : 'text-github-text-secondary'}`} viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true" fill="currentColor">
              <path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v9.5A1.75 1.75 0 0 1 14.25 14H8.061l-2.574 3.78a.75.75 0 0 1-1.237-.434V14H1.75A1.75 1.75 0 0 1 0 12.25v-9.5C0 1.784.784 1 1.75 1ZM1.5 2.75v9.5c0 .138.112.25.25.25h3.25a.75.75 0 0 1 .75.75v2.19l2.72-3.992a.75.75 0 0 1 .619-.328H14.25a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Z"></path>
            </svg>
            <span className="truncate">Community Forum</span>
          </button>

          <div className="flex items-center justify-between px-3 py-2 mb-2 group">
            <h2 className="text-github-text-secondary font-semibold text-xs uppercase tracking-wider">Direct Messages</h2>
          </div>
          
          <div className="space-y-0.5">
            {openDMs.map(user => {
               const userObj = users.find(u => u.username === user);
               const statusColor = userObj ? 
                 (userObj.status === 'available' ? 'bg-github-success' : 
                  userObj.status === 'away' ? 'bg-github-warning' : 
                  userObj.status === 'busy' ? 'bg-github-danger' : 'bg-github-text-secondary') 
                 : 'bg-github-text-secondary';
               
               const dmId = getDmId(username, user);
               
               return (
                <button 
                  key={user}
                  onClick={() => handleChannelSelect(dmId)}
                  className={`w-full text-left px-3 py-1.5 rounded-md mx-2 text-sm transition-all flex items-center gap-2 group relative ${
                    activeChannel === dmId 
                      ? 'bg-github-accent/10 text-github-text font-medium relative before:absolute before:left-[-10px] before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-4 before:bg-github-accent before:rounded-r' 
                      : 'text-github-text-secondary hover:text-github-text hover:bg-github-bg-secondary/50'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`}></div>
                  <span className="truncate">{user}</span>
                </button>
              );
            })}
           </div>
         </div>

         <div className="mt-auto px-4 pb-6">
           <Heatmap />
         </div>
       </div>

       <div className="flex-1 flex flex-col min-w-0 bg-github-bg relative">
         <div className="h-14 flex items-center justify-between px-6 border-b border-github-border bg-github-bg/95 backdrop-blur-md sticky top-0 z-10">
           <div className="flex items-center gap-2 text-sm overflow-hidden">
             <span className="text-github-text-secondary truncate">{username}</span>
             <span className="text-github-text-secondary">/</span>
             <div className="flex items-center gap-2 font-semibold text-github-text truncate">
               {activeChannel === 'forum' ? (
                 <span>Community Forum</span>
               ) : activeChannel.startsWith('dm-') ? (
                 <span>@{activeChannel.replace('dm-', '').split('-').find(u => u !== username)}</span>
               ) : (
                 <>
                   <svg className="w-4 h-4 text-github-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                   </svg>
                   <span>{activeChannel}</span>
                 </>
               )}
             </div>
             
             {activeChannel !== 'forum' && !activeChannel.startsWith('dm-') && (
               <span className="ml-2 px-2 py-0.5 rounded-full bg-github-border text-xs text-github-text-secondary border border-github-border">
                 Public
               </span>
             )}
           </div>

           <div className="flex items-center gap-3">
              <button
                onClick={onMuteToggle}
                className="p-1.5 rounded-md text-github-text-secondary hover:bg-github-bg-secondary hover:text-github-text transition-colors"
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
                    className={`p-1.5 rounded-md transition-colors ${showSearch ? 'bg-github-accent/20 text-github-accent' : 'text-github-text-secondary hover:bg-github-bg-secondary hover:text-github-text'}`}
                    title="Search messages"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  {showSearch && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-github-bg-secondary border border-github-border rounded-lg shadow-xl">
                       <SearchBar 
                         messages={messages} 
                         onResultClick={(id) => {
                           setHighlightedMessageId(id);
                           setShowSearch(false);
                         }}
                         onClose={() => setShowSearch(false)}
                       />
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowUsers(!showUsers)}
                className={`p-1.5 rounded-md transition-colors lg:hidden ${showUsers ? 'bg-github-accent/20 text-github-accent' : 'text-github-text-secondary hover:bg-github-bg-secondary hover:text-github-text'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </button>
           </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-github-bg">
           {activeChannel === 'forum' ? (
             <div className="p-6">
               <ForumChannel socket={socket} username={username} topics={forumTopics} />
             </div>
           ) : (
             <>
               <div className="max-w-4xl mx-auto w-full">
                 <MessageList 
                   messages={displayMessages} 
                   currentUser={username} 
                   currentUserRole={currentUserRole}
                   socket={socket}
                   highlightedMessageId={highlightedMessageId}
                 />
               </div>
             </>
           )}
         </div>

         {activeChannel !== 'forum' && (
           <div className="p-4 border-t border-github-border bg-github-bg relative z-20">
             <div className="max-w-4xl mx-auto">
               {filteredTypingUsers.length > 0 && (
                 <div className="mb-2 px-1 text-github-text-secondary text-xs animate-pulse">
                   {filteredTypingUsers.length === 1
                     ? `${filteredTypingUsers[0]} is typing...`
                     : `${filteredTypingUsers.length} people are typing...`}
                 </div>
               )}

               <form onSubmit={handleSubmit} className="relative bg-github-bg-secondary border border-github-border rounded-lg shadow-sm focus-within:border-github-accent focus-within:ring-1 focus-within:ring-github-accent transition-all">
                 {showSlashCommands && (
                   <div className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-github-bg-secondary border border-github-border rounded-lg shadow-xl overflow-hidden z-50">
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
                       onClose={() => setShowSearch(false)}
                     />
                   </div>
                 )}
                 
                 <div className="flex items-end p-2 gap-2">
                    <div className="pb-1">
                       <FileUpload onUpload={handleFile} />
                    </div>

                   <input
                     type="text"
                     value={input}
                     onChange={handleInputChange}
                     placeholder="Leave a comment"
                     className="flex-1 bg-transparent text-github-text placeholder-github-text-secondary text-sm py-2 px-1 focus:outline-none min-h-[40px] max-h-[200px]"
                   />

                   <button
                     type="submit"
                     disabled={!input.trim()}
                     className="px-4 py-1.5 bg-github-success text-white text-sm font-medium rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-github-success disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-0.5"
                   >
                     Comment
                   </button>
                 </div>
                 
                 <div className="bg-github-bg/50 px-3 py-1.5 border-t border-github-border/50 flex justify-between items-center text-xs text-github-text-secondary">
                   <span>Styling with Markdown is supported</span>
                   <div className="flex gap-2">
                   </div>
                 </div>
               </form>
             </div>
           </div>
         )}
       </div>

       <div className={`${showUsers ? 'flex' : 'hidden'} lg:flex flex-col w-64 bg-github-bg-secondary border-l border-github-border flex-shrink-0 transition-all duration-300 absolute lg:relative right-0 h-full z-30 shadow-xl lg:shadow-none`}>
         <div className="h-14 flex items-center px-4 border-b border-github-border">
           <h2 className="font-semibold text-github-text text-sm">Details</h2>
         </div>

         <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
           <div className="space-y-2">
              <h3 className="text-xs font-semibold text-github-text-secondary uppercase tracking-wider">About</h3>
              <p className="text-sm text-github-text">
                {activeChannel === 'chat' ? 'General discussion channel.' : 
                 activeChannel === 'forum' ? 'Threaded discussions.' : 
                 activeChannel.startsWith('dm-') ? 'Private conversation.' : 
                 `Channel for ${activeChannel}`}
              </p>
           </div>

           <div className="h-px bg-github-border opacity-50"></div>
           
           <VoiceChannel socket={socket} currentUser={username} />
           
           <div className="h-px bg-github-border opacity-50"></div>

           <UserList users={users} currentUser={username} socket={socket} onStartDM={startDM} />
         </div>
       </div>
    </div>
  );
}

export default ChatRoom;