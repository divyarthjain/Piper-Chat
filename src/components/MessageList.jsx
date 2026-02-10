import { useRef, useEffect, useState } from 'react';
import Message from './Message';

function MessageList({ messages, currentUser, currentUserRole, socket, highlightedMessageId }) {
  const bottomRef = useRef(null);
  const messageRefs = useRef({});
  const [expandedReplies, setExpandedReplies] = useState({});

  useEffect(() => {
    if (highlightedMessageId && messageRefs.current[highlightedMessageId]) {
      messageRefs.current[highlightedMessageId].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, highlightedMessageId]);

  const toggleReplies = (messageId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const handleReply = (parentId, content) => {
    socket.emit('message', content, parentId);
    setExpandedReplies(prev => ({ ...prev, [parentId]: true }));
  };

  const getReplies = (parentId) => {
    return messages.filter(m => m.parentId === parentId);
  };

  const topLevelMessages = messages.filter(m => !m.parentId);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {topLevelMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-github-text-secondary opacity-60">
          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Be the first to say something!</p>
        </div>
      ) : (
        topLevelMessages.map((msg) => {
          const replies = getReplies(msg.id);
          const isExpanded = expandedReplies[msg.id];
          
          return (
            <div 
              key={msg.id} 
              ref={el => messageRefs.current[msg.id] = el}
              className={`transition-all duration-500 rounded-lg ${
                highlightedMessageId === msg.id ? 'bg-github-accent/10 -mx-2 px-2 py-2 border border-github-accent/20' : ''
              }`}
            >
              <Message 
                message={msg} 
                isOwn={msg.user?.id === currentUser || msg.user?.username === currentUser}
                currentUser={currentUser}
                currentUserRole={currentUserRole}
                socket={socket}
                onReply={(content) => handleReply(msg.id, content)}
              />
              
              {replies.length > 0 && (
                <div className="ml-12 mt-2">
                  <button 
                    onClick={() => toggleReplies(msg.id)}
                    className="flex items-center gap-1 text-xs text-github-accent hover:underline transition-colors mb-2 font-medium"
                  >
                    <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {replies.length} replies
                  </button>
                  
                  {isExpanded && (
                    <div className="space-y-3 pl-4 py-2 border-l-2 border-github-border relative">
                      {replies.map(reply => (
                        <div 
                          key={reply.id}
                          ref={el => messageRefs.current[reply.id] = el}
                          className={highlightedMessageId === reply.id ? 'bg-github-accent/10 -mx-2 px-2 py-2 rounded border border-github-accent/20' : ''}
                        >
                          <Message 
                            message={reply} 
                            isOwn={reply.user?.id === currentUser || reply.user?.username === currentUser}
                            currentUser={currentUser}
                            currentUserRole={currentUserRole}
                            socket={socket}
                            onReply={(content) => handleReply(msg.id, content)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
