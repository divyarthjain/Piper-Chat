import { useState, useEffect, useRef } from 'react';

function SearchBar({ messages, onResultClick, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (query.trim()) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        const filtered = messages.filter(msg => 
          msg.type === 'text' && 
          msg.content.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered.reverse().slice(0, 10));
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
      setIsSearching(false);
    }
  }, [query, messages]);

  useEffect(() => {
    inputRef.current?.focus();

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const highlightText = (text, highlight) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-400/80 text-black rounded-sm px-0.5">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div ref={containerRef} className="absolute top-full right-0 mt-2 w-80 bg-[#1a1b26] border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50">
      <div className="p-3 border-b border-white/10 flex items-center gap-2">
        <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages..."
          className="flex-1 bg-transparent text-white placeholder-white/30 focus:outline-none text-sm"
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="text-white/40 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {query && results.length === 0 && !isSearching ? (
          <div className="p-8 text-center text-white/40 text-sm">
            No messages found
          </div>
        ) : (
          <div className="py-2">
            {results.map((msg) => (
              <button
                key={msg.id}
                onClick={() => onResultClick(msg.id)}
                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-violet-400 text-xs font-medium">
                    {msg.user?.username}
                  </span>
                  <span className="text-white/30 text-[10px]">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div className="text-white/80 text-sm line-clamp-2 break-all group-hover:text-white transition-colors">
                  {highlightText(msg.content, query)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
