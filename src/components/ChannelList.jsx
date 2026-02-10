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
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between px-3 py-2 mb-2 group">
        <h2 className="text-github-text-secondary font-semibold text-xs uppercase tracking-wider">Channels</h2>
        <button 
          onClick={() => setIsCreating(true)}
          className="text-github-text-secondary hover:text-github-accent transition-colors opacity-0 group-hover:opacity-100"
          title="Create Channel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="px-3 mb-2">
          <input
            type="text"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="channel-name"
            className="w-full bg-github-bg-secondary text-github-text text-sm rounded-md px-2 py-1 focus:outline-none border border-github-border focus:border-github-accent focus:ring-1 focus:ring-github-accent"
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
          className={`text-left px-3 py-1.5 rounded-md mx-2 text-sm transition-all flex items-center gap-2 group relative ${
            activeChannel === channel 
              ? 'bg-github-accent/10 text-github-text font-medium relative before:absolute before:left-[-10px] before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-4 before:bg-github-accent before:rounded-r' 
              : 'text-github-text-secondary hover:text-github-text hover:bg-github-bg-secondary'
          }`}
        >
          <span className={`flex-shrink-0 ${activeChannel === channel ? 'text-github-accent' : 'text-github-text-secondary/50'}`}>
            <svg className="w-4 h-4" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true" fill="currentColor">
              <path d="M6.75 2a.75.75 0 0 1 .75.75V4.5h2V2.75a.75.75 0 0 1 1.5 0V4.5h3.25a.75.75 0 0 1 0 1.5H11v3h3.25a.75.75 0 0 1 0 1.5H11v1.75a.75.75 0 0 1-1.5 0V10.5h-2v1.75a.75.75 0 0 1-1.5 0V10.5H2.75a.75.75 0 0 1 0-1.5H6v-3H2.75a.75.75 0 0 1 0-1.5H6V2.75A.75.75 0 0 1 6.75 2ZM11 9V6H7.5v3H11Z"></path>
            </svg>
          </span>
          <span className="truncate">{channel}</span>
        </button>
      ))}
    </div>
  );
}

export default ChannelList;
