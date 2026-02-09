import { useRef, useEffect } from 'react';
import Message from './Message';

function MessageList({ messages, currentUser }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-white/40">
          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-lg">No messages yet</p>
          <p className="text-sm">Be the first to say something!</p>
        </div>
      ) : (
        messages.map((msg) => (
          <Message key={msg.id} message={msg} isOwn={msg.user?.id === currentUser || msg.user?.username === currentUser} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
