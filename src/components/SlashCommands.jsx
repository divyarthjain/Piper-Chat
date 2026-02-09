import { useState, useEffect, useRef } from 'react';

const COMMANDS = [
  { name: 'help', description: 'Show available commands', usage: '/help' },
  { name: 'clear', description: 'Clear local message view', usage: '/clear' },
  { name: 'users', description: 'List online users', usage: '/users' },
  { name: 'me', description: 'Send action message', usage: '/me [action]' },
  { name: 'shrug', description: 'Send ¯\\_(ツ)_/¯', usage: '/shrug' },
  { name: 'tableflip', description: 'Send (╯°□°)╯︵ ┻━┻', usage: '/tableflip' },
  { name: 'unflip', description: 'Send ┬─┬ノ( º _ ºノ)', usage: '/unflip' },
  { name: 'lenny', description: 'Send ( ͡° ͜ʖ ͡°)', usage: '/lenny' },
];

function SlashCommands({ input, onSelect, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef(null);

  const query = input.slice(1).toLowerCase();
  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.name.toLowerCase().startsWith(query)
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [input]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (filteredCommands.length > 0) {
          e.preventDefault();
          onSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredCommands.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50"
    >
      <div className="p-2 border-b border-white/10">
        <span className="text-xs text-white/50 uppercase tracking-wider">Commands</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filteredCommands.map((cmd, idx) => (
          <button
            key={cmd.name}
            onClick={() => onSelect(cmd)}
            className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
              idx === selectedIndex ? 'bg-violet-500/30' : 'hover:bg-white/5'
            }`}
          >
            <span className="text-violet-400 font-mono text-sm">/{cmd.name}</span>
            <span className="text-white/70 text-sm flex-1">{cmd.description}</span>
            <span className="text-white/30 text-xs">{cmd.usage}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SlashCommands;
