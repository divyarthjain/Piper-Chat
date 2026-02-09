import { useState, useEffect } from 'react';
import StatusPicker from './StatusPicker';

function UserList({ users, currentUser, socket }) {
  const [showPicker, setShowPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const currentUserData = users.find(u => u.username === currentUser);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e, targetUser) => {
    e.preventDefault();
    if (targetUser.username === currentUser) return;

    const myRole = currentUserData?.role || 'member';
    if (!['admin', 'moderator'].includes(myRole)) return;

    const targetRole = targetUser.role || 'member';
    if (myRole === 'moderator' && ['admin', 'moderator'].includes(targetRole)) return;

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      user: targetUser
    });
  };

  const handleAction = (action, payload) => {
    if (!contextMenu) return;
    
    switch (action) {
      case 'set-role':
        socket.emit('set-role', { targetUsername: contextMenu.user.username, newRole: payload });
        break;
      case 'kick':
        socket.emit('kick-user', contextMenu.user.username);
        break;
      case 'mute':
        socket.emit('mute-user', { targetUsername: contextMenu.user.username, durationMinutes: payload });
        break;
    }
    setContextMenu(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'dnd': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const handleStatusSave = ({ status, customStatus }) => {
    socket.emit('set-status', { status, customStatus });
    setShowPicker(false);
  };

  return (
    <div className="w-full lg:w-64 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-4">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
        Online ({users.length})
      </h2>

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => user.username === currentUser && setShowPicker(true)}
            onContextMenu={(e) => handleContextMenu(e, user)}
            className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
              user.username === currentUser ? 'bg-white/10 hover:bg-white/20 cursor-pointer' : 'hover:bg-white/5 cursor-default'
            }`}
          >
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-inner"
                style={{ backgroundColor: user.color }}
              >
                {user.username[0].toUpperCase()}
              </div>
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1a2e] ${getStatusColor(user.status)}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-white font-medium truncate">
                  {user.username}
                </p>
                {user.role === 'admin' && <span title="Admin">👑</span>}
                {user.role === 'moderator' && <span title="Moderator">🛡️</span>}
                {user.username === currentUser && (
                  <span className="text-white/30 text-[10px] font-bold uppercase tracking-tighter">You</span>
                )}
              </div>
              {user.customStatus && (
                <p className="text-white/50 text-xs truncate leading-tight">
                  {user.customStatus}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {contextMenu && (
        <div 
          className="fixed bg-[#1a1b26] border border-white/10 rounded-xl shadow-2xl py-1 z-50 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="px-3 py-2 text-xs font-semibold text-white/40 border-b border-white/5 mb-1">
            {contextMenu.user.username}
          </div>
          
          {currentUserData?.role === 'admin' && (
            <>
              {contextMenu.user.role !== 'admin' && (
                <button 
                  onClick={() => handleAction('set-role', 'admin')}
                  className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <span>👑</span> Make Admin
                </button>
              )}
              {contextMenu.user.role !== 'moderator' && (
                <button 
                  onClick={() => handleAction('set-role', 'moderator')}
                  className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <span>🛡️</span> Make Moderator
                </button>
              )}
              {['admin', 'moderator'].includes(contextMenu.user.role) && (
                <button 
                  onClick={() => handleAction('set-role', 'member')}
                  className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <span>🔽</span> Demote to Member
                </button>
              )}
              <div className="h-px bg-white/5 my-1" />
            </>
          )}

          <button 
            onClick={() => handleAction('kick')}
            className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Kick User
          </button>
          
          <div className="h-px bg-white/5 my-1" />
          
          <div className="px-3 py-1 text-[10px] font-semibold text-white/30 uppercase">Mute</div>
          <button onClick={() => handleAction('mute', 5)} className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-white/10 transition-colors">5 Minutes</button>
          <button onClick={() => handleAction('mute', 15)} className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-white/10 transition-colors">15 Minutes</button>
          <button onClick={() => handleAction('mute', 60)} className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-white/10 transition-colors">1 Hour</button>
        </div>
      )}

      {showPicker && currentUserData && (
        <StatusPicker
          currentStatus={currentUserData.status}
          currentCustomStatus={currentUserData.customStatus}
          onSave={handleStatusSave}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

export default UserList;
