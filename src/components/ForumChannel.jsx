import { useState } from 'react';
import { format } from 'date-fns';

function ForumChannel({ socket, username, topics = [] }) {
  const [activeTopic, setActiveTopic] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', body: '', tags: '' });
  const [replyBody, setReplyBody] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const handleCreateTopic = (e) => {
    e.preventDefault();
    if (!newTopic.title.trim() || !newTopic.body.trim()) return;

    const tags = newTopic.tags.split(',').map(t => t.trim()).filter(Boolean);
    
    socket.emit('forum-create-topic', {
      title: newTopic.title,
      body: newTopic.body,
      tags
    });

    setNewTopic({ title: '', body: '', tags: '' });
    setShowCreateModal(false);
  };

  const handleReply = (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;

    socket.emit('forum-reply', {
      topicId: activeTopic.id,
      body: replyBody
    });

    setReplyBody('');
  };

  const handleResolve = (topicId) => {
    socket.emit('forum-resolve', { topicId });
  };

  const currentTopic = activeTopic ? topics.find(t => t.id === activeTopic.id) : null;

  const filteredTopics = topics
    .filter(topic => {
      if (filter === 'resolved') return topic.resolved;
      if (filter === 'unresolved') return !topic.resolved;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'most-replies') return b.replies.length - a.replies.length;
      return 0;
    });

  if (currentTopic) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-4">
          <button 
            onClick={() => setActiveTopic(null)}
            className="p-2 hover:bg-white/10 rounded-lg text-white/70 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{currentTopic.title}</h2>
              {currentTopic.resolved && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                  Resolved
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/50 mt-1">
              <span>By {currentTopic.author}</span>
              <span>•</span>
              <span>{format(new Date(currentTopic.createdAt), 'MMM d, HH:mm')}</span>
            </div>
          </div>
          {currentTopic.author === username && (
            <button
              onClick={() => handleResolve(currentTopic.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentTopic.resolved 
                  ? 'bg-white/10 text-white/50 hover:bg-white/20' 
                  : 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'
              }`}
            >
              {currentTopic.resolved ? 'Reopen' : 'Mark Resolved'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <p className="text-white/90 whitespace-pre-wrap leading-relaxed">{currentTopic.body}</p>
            {currentTopic.tags.length > 0 && (
              <div className="flex gap-2 mt-4">
                {currentTopic.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-violet-500/20 text-violet-300 text-xs rounded-full border border-violet-500/30">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-white/70 text-sm font-medium px-2">{currentTopic.replies.length} Replies</h3>
            {currentTopic.replies.map(reply => (
              <div key={reply.id} className="flex gap-3 px-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: reply.authorColor || '#6366F1' }}
                >
                  {reply.author[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="bg-white/5 rounded-2xl rounded-tl-none p-3 border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white text-sm">{reply.author}</span>
                      <span className="text-xs text-white/40">{format(new Date(reply.createdAt), 'MMM d, HH:mm')}</span>
                    </div>
                    <p className="text-white/80 text-sm whitespace-pre-wrap">{reply.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleReply} className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
            />
            <button
              type="submit"
              disabled={!replyBody.trim()}
              className="px-6 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Reply
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/10 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Topics</option>
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="newest">Newest First</option>
            <option value="most-replies">Most Replies</option>
          </select>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-lg hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-lg shadow-violet-500/20"
        >
          New Topic
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredTopics.length === 0 ? (
          <div className="text-center text-white/40 mt-12">
            <p>No topics found. Start a conversation!</p>
          </div>
        ) : (
          filteredTopics.map(topic => (
            <div 
              key={topic.id}
              onClick={() => setActiveTopic(topic)}
              className="group p-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl cursor-pointer transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">
                  {topic.title}
                </h3>
                {topic.resolved && (
                  <span className="flex-shrink-0 px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                    Resolved
                  </span>
                )}
              </div>
              <p className="text-white/60 text-sm line-clamp-2 mb-3">{topic.body}</p>
              <div className="flex items-center justify-between text-xs text-white/40">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: topic.authorColor || '#6366F1' }}
                    />
                    {topic.author}
                  </span>
                  <span>{format(new Date(topic.createdAt), 'MMM d')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {topic.replies.length}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1a1b26] border border-white/10 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Create New Topic</h3>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Title</label>
                <input
                  type="text"
                  value={newTopic.title}
                  onChange={(e) => setNewTopic({...newTopic, title: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="What's on your mind?"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Content</label>
                <textarea
                  value={newTopic.body}
                  onChange={(e) => setNewTopic({...newTopic, body: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 h-32 resize-none"
                  placeholder="Describe your topic..."
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newTopic.tags}
                  onChange={(e) => setNewTopic({...newTopic, tags: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="general, help, discussion"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTopic.title.trim() || !newTopic.body.trim()}
                  className="px-6 py-2 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForumChannel;
