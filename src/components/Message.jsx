import { useState } from 'react';

const SERVER_URL = `http://${window.location.hostname}:3001`;

function Message({ message, isOwn }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <span className="px-4 py-1.5 bg-white/10 rounded-full text-white/60 text-sm">
          {message.content}
        </span>
      </div>
    );
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
              <span className="text-white/70 text-sm font-medium">
                {message.user?.username}
              </span>
            </div>
          )}

          <div
            className={`rounded-2xl px-4 py-2.5 ${
              isOwn
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-br-md'
                : 'bg-white/15 text-white rounded-bl-md'
            }`}
          >
            {message.type === 'image' ? (
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
            ) : (
              <p className="break-words">{message.content}</p>
            )}
          </div>

          <div className={`text-white/40 text-xs mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
            {formatTime(message.timestamp)}
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
