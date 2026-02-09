function UserList({ users, currentUser }) {
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
            className={`flex items-center gap-3 p-2 rounded-xl ${
              user.username === currentUser ? 'bg-white/10' : ''
            }`}
          >
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: user.color }}
              >
                {user.username[0].toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1a2e]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">
                {user.username}
                {user.username === currentUser && (
                  <span className="text-white/50 text-sm ml-1">(you)</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserList;
