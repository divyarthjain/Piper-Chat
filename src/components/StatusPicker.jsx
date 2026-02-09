import { useState } from 'react';

const PRESET_STATUSES = [
  { id: 'available', label: 'Available', color: 'bg-green-500', icon: '🟢' },
  { id: 'away', label: 'Away', color: 'bg-yellow-500', icon: '🟡' },
  { id: 'busy', label: 'Busy', color: 'bg-red-500', icon: '🔴' },
  { id: 'dnd', label: 'Do Not Disturb', color: 'bg-red-600', icon: '⛔' },
];

const EMOJIS = ['😊', '👨‍💻', '🍕', '🏃‍♂️', '📚', '🎧', '☕', '🌟', '🏠', '✈️', '🎮', '🔥'];

function StatusPicker({ currentStatus, currentCustomStatus, onSave, onClose }) {
  const [status, setStatus] = useState(currentStatus || 'available');
  const [customStatus, setCustomStatus] = useState(currentCustomStatus || '');

  const handleSave = () => {
    onSave({ status, customStatus });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[#1a1a2e]/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">Set Status</h3>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {PRESET_STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                  status === s.id
                    ? 'bg-white/20 border-white/40 shadow-lg'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${s.color}`} />
                <span className="text-white text-sm font-medium">{s.label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
              Custom Message
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="What's happening?"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                maxLength={50}
              />
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setCustomStatus(prev => {
                        const firstChar = prev.match(/^\p{Emoji}/u);
                        if (firstChar) {
                            return emoji + prev.slice(firstChar[0].length);
                        }
                        return emoji + " " + prev;
                    })}
                    className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-xl transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl shadow-lg hover:shadow-violet-500/20 transition-all"
          >
            Save Status
          </button>
        </div>
      </div>
    </div>
  );
}

export default StatusPicker;
