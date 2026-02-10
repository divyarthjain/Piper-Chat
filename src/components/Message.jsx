import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import LinkPreview from './LinkPreview';

const SERVER_URL = `http://${window.location.hostname}:3001`;

const extractUrl = (text) => {
  if (typeof text !== 'string') return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
};

function Message({ message, isOwn, currentUser, currentUserRole, socket, onReply }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const commonEmojis = ['👍', '❤️', '😂', '🎉', '🔥', '👀'];

  const handleReplySubmit = () => {
    if (replyContent.trim()) {
      onReply(replyContent);
      setIsReplying(false);
      setReplyContent('');
    }
  };

  const handleReaction = (emoji) => {
    if (!socket || !currentUser) return;
    
    const hasReacted = message.reactions?.find(r => r.emoji === emoji)?.users.includes(currentUser);
    if (hasReacted) {
      socket.emit('remove-reaction', { messageId: message.id, emoji });
    } else {
      socket.emit('add-reaction', { messageId: message.id, emoji });
    }
    setShowPicker(false);
  };

  const handleEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() !== message.content) {
      socket.emit('edit-message', { messageId: message.id, newContent: editContent });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      socket.emit('delete-message', message.id);
    }
  };

  const roleBadge = message.user?.role === 'admin' ? 'Owner' : message.user?.role === 'moderator' ? 'Mod' : '';
  const canDelete = isOwn || ['admin', 'moderator'].includes(currentUserRole);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="px-3 py-1 bg-github-bg-secondary rounded-full text-github-text-secondary text-xs border border-github-border">
          {message.content}
        </span>
      </div>
    );
  }

  if (message.type === 'bot') {
    return (
      <div className="flex gap-4 py-2 group">
        <div className="w-10 h-10 rounded-full bg-github-bg-secondary border border-github-border flex items-center justify-center text-lg flex-shrink-0">
          {message.icon || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-github-text text-sm">
              {message.user?.username || 'Bot'}
            </span>
            <span className="px-1.5 py-0.5 bg-github-accent/20 border border-github-accent/30 rounded-full text-xs text-github-accent font-medium">BOT</span>
            <span className="text-github-text-secondary text-xs">{formatTime(message.timestamp)}</span>
          </div>
          <div className="text-github-text text-sm prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 py-2 group ${isOwn ? '' : ''}`}>
      <div className="flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
          style={{ backgroundColor: message.user?.color || '#6366f1' }}
        >
          {message.user?.username?.[0]?.toUpperCase() || '?'}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="border border-github-border rounded-md bg-github-bg-secondary/30">
          <div className="flex items-center justify-between px-3 py-2 bg-github-bg-secondary/50 border-b border-github-border rounded-t-md">
             <div className="flex items-center gap-2">
                <span className="font-semibold text-github-text text-sm hover:underline cursor-pointer">
                  {message.user?.username}
                </span>
                {roleBadge && (
                  <span className="px-1.5 py-0.5 rounded-full bg-github-border text-xs text-github-text-secondary border border-github-border/50">
                    {roleBadge}
                  </span>
                )}
                <span className="text-github-text-secondary text-xs">
                  commented at {formatTime(message.timestamp)}
                </span>
                {message.edited && <span className="text-github-text-secondary text-xs">(edited)</span>}
             </div>
             
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className="p-1 rounded text-github-text-secondary hover:text-github-accent transition-colors"
                  title="Add reaction"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="p-1 rounded text-github-text-secondary hover:text-github-accent transition-colors"
                  title="Reply"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
                {(isOwn || canDelete) && (
                   <div className="relative">
                      <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 rounded text-github-text-secondary hover:text-github-text transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-github-bg-secondary border border-github-border rounded-md shadow-xl py-1 z-20 min-w-[120px]">
                           {message.type === 'text' && (
                             <button
                               onClick={handleEdit}
                               className="w-full text-left px-4 py-1.5 text-xs text-github-text hover:bg-github-accent hover:text-white transition-colors"
                             >
                               Edit
                             </button>
                           )}
                           <button
                             onClick={() => { handleDelete(); setShowMenu(false); }}
                             className="w-full text-left px-4 py-1.5 text-xs text-github-danger hover:bg-github-danger hover:text-white transition-colors"
                           >
                             Delete
                           </button>
                        </div>
                      )}
                   </div>
                )}
             </div>
          </div>
          
          <div className="p-3 bg-transparent">
             {message.type === 'file' ? (
                <div className="flex items-center gap-3 p-3 bg-github-bg border border-github-border rounded-md">
                   <div className="text-2xl">
                     {message.content.mimetype?.includes('pdf') ? '📄' : 
                      message.content.mimetype?.includes('zip') ? '📦' :
                      message.content.mimetype?.includes('audio') ? '🎵' :
                      message.content.mimetype?.includes('video') ? '🎬' : '📎'}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="font-medium text-sm text-github-text truncate">
                       {message.content.originalName}
                     </div>
                     <div className="text-xs text-github-text-secondary">
                       {message.content.size < 1024 * 1024 
                         ? `${(message.content.size / 1024).toFixed(1)} KB`
                         : `${(message.content.size / 1024 / 1024).toFixed(1)} MB`}
                     </div>
                   </div>
                   <a 
                     href={`${SERVER_URL}${message.content.url}`} 
                     download={message.content.originalName}
                     className="text-github-accent hover:underline text-sm font-medium"
                     target="_blank"
                     rel="noopener noreferrer"
                   >
                     Download
                   </a>
                </div>
             ) : message.type === 'image' ? (
                <div className="relative">
                   <img
                     src={`${SERVER_URL}${message.content}`}
                     alt="Shared image"
                     className="max-w-full rounded-md cursor-pointer border border-github-border"
                     onClick={() => setShowFullImage(true)}
                   />
                </div>
             ) : isEditing ? (
                <div className="flex flex-col gap-2">
                   <textarea
                     value={editContent}
                     onChange={(e) => setEditContent(e.target.value)}
                     className="w-full bg-github-bg text-github-text rounded-md p-2 border border-github-border focus:border-github-accent focus:ring-1 focus:ring-github-accent outline-none text-sm font-mono min-h-[100px]"
                   />
                   <div className="flex justify-end gap-2">
                     <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs font-medium text-github-text-secondary bg-github-bg border border-github-border rounded-md hover:bg-github-bg-secondary">
                       Cancel
                     </button>
                     <button onClick={handleSaveEdit} className="px-3 py-1.5 text-xs font-medium text-white bg-github-success border border-github-success rounded-md hover:bg-opacity-90">
                       Update comment
                     </button>
                   </div>
                </div>
             ) : (
                <div className="prose prose-invert prose-sm max-w-none text-github-text prose-a:text-github-accent prose-code:bg-github-bg-secondary prose-code:text-github-text prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-github-bg-secondary prose-pre:border prose-pre:border-github-border">
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderRadius: '0.375rem',
                              fontSize: '0.85rem',
                            }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-github-bg-secondary text-github-text px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                  {extractUrl(message.content) && <LinkPreview url={extractUrl(message.content)} />}
                </div>
             )}
          </div>
          
          {(message.reactions?.length > 0 || showPicker) && (
             <div className="px-3 py-2 bg-github-bg-secondary/30 border-t border-github-border flex items-center gap-2 flex-wrap">
                {showPicker && (
                   <div className="flex gap-1 bg-github-bg border border-github-border rounded-full p-1 shadow-sm">
                      {commonEmojis.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(emoji)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-github-bg-secondary rounded-full transition-colors text-base"
                        >
                          {emoji}
                        </button>
                      ))}
                   </div>
                )}
                {message.reactions?.map((reaction, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleReaction(reaction.emoji)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      reaction.users.includes(currentUser)
                        ? 'bg-github-accent/10 border-github-accent/30 text-github-accent'
                        : 'bg-github-bg border-github-border text-github-text-secondary hover:bg-github-bg-secondary'
                    }`}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.users.length}</span>
                  </button>
                ))}
             </div>
          )}
        </div>

        {isReplying && (
           <div className="mt-2 ml-4 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-github-bg-secondary border border-github-border flex items-center justify-center flex-shrink-0 text-xs">
                 ↪
              </div>
              <div className="flex-1 border border-github-border rounded-md bg-github-bg">
                 <textarea
                   value={replyContent}
                   onChange={(e) => setReplyContent(e.target.value)}
                   placeholder="Write a reply..."
                   className="w-full bg-transparent text-github-text p-2 text-sm outline-none min-h-[60px] resize-y"
                   autoFocus
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleReplySubmit();
                     } else if (e.key === 'Escape') setIsReplying(false);
                   }}
                 />
                 <div className="flex justify-end gap-2 p-2 bg-github-bg-secondary/30 border-t border-github-border">
                    <button onClick={() => setIsReplying(false)} className="px-3 py-1 text-xs text-github-text-secondary hover:text-github-text">Cancel</button>
                    <button onClick={handleReplySubmit} disabled={!replyContent.trim()} className="px-3 py-1 text-xs bg-github-success text-white rounded-md font-medium disabled:opacity-50">Reply</button>
                 </div>
              </div>
           </div>
        )}
      </div>

      {showFullImage && message.type === 'image' && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <img
            src={`${SERVER_URL}${message.content}`}
            alt="Full size image"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default Message;
