import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const SERVER_URL = `http://${window.location.hostname}:3001`;

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

  const roleBadge = message.user?.role === 'admin' ? '👑' : message.user?.role === 'moderator' ? '🛡️' : '';
  const canDelete = isOwn || ['admin', 'moderator'].includes(currentUserRole);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <span className="px-4 py-1.5 bg-white/10 rounded-full text-white/60 text-sm">
          {message.content}
        </span>
      </div>
    );
  }

  if (message.type === 'bot') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%]">
          <div className="flex items-center gap-2 mb-1 ml-1">
            <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm">
              {message.icon || '🤖'}
            </div>
            <span className="text-white/70 text-sm font-medium flex items-center gap-1">
              {message.user?.username || 'Bot'}
              <span className="px-1.5 py-0.5 bg-violet-500/30 rounded text-xs text-violet-300">BOT</span>
            </span>
          </div>
          <div className="rounded-2xl px-4 py-2.5 bg-violet-500/20 border border-violet-500/30 text-white rounded-bl-md">
            <div className="break-words prose prose-invert prose-sm max-w-none prose-p:my-1">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
          <div className="text-white/40 text-xs mt-1 ml-1">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {!isOwn && (
            <div className="flex items-center gap-2 mb-1 ml-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: message.user?.color || '#6366f1' }}
              >
                {message.user?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-white/70 text-sm font-medium flex items-center gap-1">
                {message.user?.username}
                {roleBadge && <span title={message.user?.role}>{roleBadge}</span>}
              </span>
            </div>
          )}

          <div className="relative group">
            <div
              className={`rounded-2xl px-4 py-2.5 ${
                isOwn
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-br-md'
                  : 'bg-white/15 text-white rounded-bl-md'
              }`}
            >
              {message.type === 'file' ? (
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center text-xl shrink-0">
                    {message.content.mimetype?.includes('pdf') ? '📄' : 
                     message.content.mimetype?.includes('zip') ? '📦' :
                     message.content.mimetype?.includes('audio') ? '🎵' :
                     message.content.mimetype?.includes('video') ? '🎬' :
                     message.content.mimetype?.includes('text') || message.content.originalName?.match(/\.(js|jsx|ts|tsx|py|html|css|json)$/) ? '📝' : '📎'}
                  </div>
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="font-medium text-sm truncate max-w-[180px]" title={message.content.originalName}>
                      {message.content.originalName}
                    </div>
                    <div className="text-xs text-white/60">
                      {message.content.size < 1024 * 1024 
                        ? `${(message.content.size / 1024).toFixed(1)} KB`
                        : `${(message.content.size / 1024 / 1024).toFixed(1)} MB`}
                    </div>
                  </div>
                  <a 
                    href={`${SERVER_URL}${message.content.url}`} 
                    download={message.content.originalName}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              ) : message.type === 'image' ? (
                <div className="relative">
                  {!imageLoaded && (
                    <div className="w-48 h-32 bg-white/10 rounded-lg animate-pulse flex items-center justify-center">
                      <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <img
                    src={`${SERVER_URL}${message.content}`}
                    alt="Shared image"
                    className={`max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${imageLoaded ? 'block' : 'hidden'}`}
                    onLoad={() => setImageLoaded(true)}
                    onClick={() => setShowFullImage(true)}
                  />
                </div>
              ) : isEditing ? (
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-black/20 text-white rounded p-2 outline-none border border-white/10 focus:border-violet-500/50 resize-none text-sm font-normal"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveEdit();
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={handleCancelEdit} 
                      className="px-2 py-1 text-xs rounded hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveEdit} 
                      className="px-2 py-1 text-xs bg-violet-600 rounded hover:bg-violet-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="break-words prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-code:text-pink-300 prose-a:text-violet-400">
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
                              borderRadius: '0.5rem',
                              fontSize: '0.85rem',
                            }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-white/20 px-1.5 py-0.5 rounded text-pink-300 text-sm" {...props}>
                            {children}
                          </code>
                        );
                      },
                      a({ children, href, ...props }) {
                        return (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline" {...props}>
                            {children}
                          </a>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-16' : '-right-16'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 items-center`}>
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="p-1 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors"
                title="Add reaction"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <button
                onClick={() => setIsReplying(!isReplying)}
                className="p-1 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors"
                title="Reply"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>

              {isOwn ? (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors"
                    title="Message options"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  {showMenu && (
                    <div className="absolute bottom-full mb-2 right-0 bg-[#1a1b26] border border-white/10 rounded-xl p-1 shadow-xl flex flex-col gap-0.5 z-20 min-w-[100px] overflow-hidden">
                      {message.type === 'text' && (
                        <button
                          onClick={handleEdit}
                          className="w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => { handleDelete(); setShowMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                canDelete && (
                  <button
                    onClick={handleDelete}
                    className="p-1 rounded-full bg-black/40 text-red-400 hover:text-red-300 hover:bg-black/60 transition-colors"
                    title="Delete message"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )
              )}
              
              {showPicker && (
                <div className={`absolute bottom-full mb-2 ${isOwn ? 'right-0' : 'left-0'} bg-[#1a1b26] border border-white/10 rounded-xl p-2 shadow-xl flex gap-1 z-10 min-w-max`}>
                  {commonEmojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {message.reactions && message.reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {message.reactions.map((reaction, idx) => (
                <button
                  key={idx}
                  onClick={() => handleReaction(reaction.emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                    reaction.users.includes(currentUser)
                      ? 'bg-violet-500/20 border-violet-500/50 text-violet-200'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.users.length}</span>
                </button>
              ))}
            </div>
          )}

          {isReplying && (
            <div className={`mt-2 flex flex-col gap-2 ${isOwn ? 'items-end' : 'items-start'}`}>
              <div className="w-full max-w-sm">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full bg-black/20 text-white rounded-lg p-2 text-sm outline-none border border-white/10 focus:border-violet-500/50 resize-none"
                  rows={2}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReplySubmit();
                    } else if (e.key === 'Escape') {
                      setIsReplying(false);
                    }
                  }}
                />
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={() => setIsReplying(false)}
                    className="px-2 py-1 text-xs text-white/60 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReplySubmit}
                    disabled={!replyContent.trim()}
                    className="px-3 py-1 text-xs bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={`text-white/40 text-xs mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
            {formatTime(message.timestamp)}
            {message.edited && <span className="ml-1 opacity-70">(edited)</span>}
          </div>
        </div>
      </div>

      {showFullImage && message.type === 'image' && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <img
            src={`${SERVER_URL}${message.content}`}
            alt="Full size image"
            className="max-w-full max-h-full object-contain rounded-lg"
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
    </>
  );
}

export default Message;
