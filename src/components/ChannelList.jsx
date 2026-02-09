import { useState } from 'react';

function ChannelList({ channels, activeChannel, onSelectChannel, onCreateChannel }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (newChannelName.trim()) {
      onCreateChannel(newChannelName.trim());
      setNewChannelName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-2 mb-2">
        <h2 className="text-white font-bold uppercase text-xs tracking-wider opacity-50">Channels</h2>
        <button 
          onClick={() => setIsCreating(true)}
          className="text-white/50 hover:text-white transition-colors"
          title="Create Channel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="px-2 mb-2">
          <input
            type="text"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="channel-name"
            className="w-full bg-black/20 text-white text-sm rounded px-2 py-1 focus:outline-none border border-white/10 focus:border-white/30"
            autoFocus
            onBlur={() => !newChannelName && setIsCreating(false)}
            maxLength={20}
          />
        </form>
      )}
      
      {channels.map((channel) => (
        <button
          key={channel}
          onClick={() => onSelectChannel(channel)}
          className={`text-left px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeChannel === channel 
              ? 'bg-white/20 text-white font-medium shadow-sm' 
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="opacity-50">#</span>
          <span className="truncate">{channel}</span>
        </button>
      ))}
    </div>
  );
}

export default ChannelList;
