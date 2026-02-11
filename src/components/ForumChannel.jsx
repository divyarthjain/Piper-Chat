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
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-github-bg text-github-text">
        <div className="p-4 border-b border-github-border flex items-center gap-4">
          <button 
            onClick={() => setActiveTopic(null)}
            className="p-2 hover:bg-github-bg-secondary rounded-md text-github-text-secondary hover:text-github-text transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-github-text">{currentTopic.title}</h2>
              {currentTopic.resolved && (
                <span className="px-2 py-0.5 bg-github-success/20 text-github-success text-xs rounded-full border border-github-success/30">
                  Resolved
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-github-text-secondary mt-1">
              <span>By {currentTopic.author}</span>
              <span>•</span>
              <span>{format(new Date(currentTopic.createdAt), 'MMM d, HH:mm')}</span>
            </div>
          </div>
          {currentTopic.author === username && (
            <button
              onClick={() => handleResolve(currentTopic.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentTopic.resolved 
                  ? 'bg-github-bg-secondary text-github-text-secondary hover:bg-github-border' 
                  : 'bg-github-success/20 text-github-success hover:bg-github-success/30 border border-github-success/30'
              }`}
            >
              {currentTopic.resolved ? 'Reopen' : 'Mark Resolved'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div className="bg-github-bg-secondary border border-github-border rounded-md p-6">
            <p className="text-github-text whitespace-pre-wrap leading-relaxed">{currentTopic.body}</p>
            {currentTopic.tags.length > 0 && (
              <div className="flex gap-2 mt-4">
                {currentTopic.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-github-accent/10 text-github-accent text-xs rounded-full border border-github-accent/20">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-github-text-secondary text-sm font-medium px-2">{currentTopic.replies.length} Replies</h3>
            {currentTopic.replies.map(reply => (
              <div key={reply.id} className="flex gap-3 px-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: reply.authorColor || '#6366F1' }}
                >
                  {reply.author[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="bg-github-bg-secondary rounded-md rounded-tl-none p-3 border border-github-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-github-text text-sm">{reply.author}</span>
                      <span className="text-xs text-github-text-secondary">{format(new Date(reply.createdAt), 'MMM d, HH:mm')}</span>
                    </div>
                    <p className="text-github-text text-sm whitespace-pre-wrap">{reply.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleReply} className="p-4 border-t border-github-border bg-github-bg">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 px-4 py-3 bg-github-bg-secondary border border-github-border rounded-md text-github-text placeholder-github-text-secondary focus:outline-none focus:ring-1 focus:ring-github-accent transition-all"
            />
            <button
              type="submit"
              disabled={!replyBody.trim()}
              className="px-6 py-3 bg-github-success text-white font-semibold rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Reply
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-github-bg text-github-text">
      <div className="p-4 border-b border-github-border flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-github-bg-secondary border border-github-border rounded-md px-3 py-1.5 text-sm text-github-text focus:outline-none focus:ring-1 focus:ring-github-accent"
          >
            <option value="all">All Topics</option>
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-github-bg-secondary border border-github-border rounded-md px-3 py-1.5 text-sm text-github-text focus:outline-none focus:ring-1 focus:ring-github-accent"
          >
            <option value="newest">Newest First</option>
            <option value="most-replies">Most Replies</option>
          </select>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-github-success text-white text-sm font-semibold rounded-md hover:bg-opacity-90 transition-all shadow-sm"
        >
          New Topic
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {filteredTopics.length === 0 ? (
          <div className="text-center text-github-text-secondary mt-12">
            <p>No topics found. Start a conversation!</p>
          </div>
        ) : (
          filteredTopics.map(topic => (
            <div 
              key={topic.id}
              onClick={() => setActiveTopic(topic)}
              className="group p-4 bg-github-bg-secondary border border-github-border hover:border-github-accent/50 rounded-md cursor-pointer transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-github-text group-hover:text-github-accent transition-colors">
                  {topic.title}
                </h3>
                {topic.resolved && (
                  <span className="flex-shrink-0 px-2 py-0.5 bg-github-success/20 text-github-success text-xs rounded-full border border-github-success/30">
                    Resolved
                  </span>
                )}
              </div>
              <p className="text-github-text-secondary text-sm line-clamp-2 mb-3">{topic.body}</p>
              <div className="flex items-center justify-between text-xs text-github-text-secondary">
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
          <div className="w-full max-w-lg bg-github-bg border border-github-border rounded-lg shadow-2xl p-6">
            <h3 className="text-xl font-bold text-github-text mb-4">Create New Topic</h3>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-sm text-github-text-secondary mb-1">Title</label>
                <input
                  type="text"
                  value={newTopic.title}
                  onChange={(e) => setNewTopic({...newTopic, title: e.target.value})}
                  className="w-full px-4 py-2 bg-github-bg-secondary border border-github-border rounded-md text-github-text focus:outline-none focus:ring-1 focus:ring-github-accent"
                  placeholder="What's on your mind?"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-github-text-secondary mb-1">Content</label>
                <textarea
                  value={newTopic.body}
                  onChange={(e) => setNewTopic({...newTopic, body: e.target.value})}
                  className="w-full px-4 py-2 bg-github-bg-secondary border border-github-border rounded-md text-github-text focus:outline-none focus:ring-1 focus:ring-github-accent h-32 resize-none"
                  placeholder="Describe your topic..."
                />
              </div>
              <div>
                <label className="block text-sm text-github-text-secondary mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newTopic.tags}
                  onChange={(e) => setNewTopic({...newTopic, tags: e.target.value})}
                  className="w-full px-4 py-2 bg-github-bg-secondary border border-github-border rounded-md text-github-text focus:outline-none focus:ring-1 focus:ring-github-accent"
                  placeholder="general, help, discussion"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-github-text-secondary hover:text-github-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTopic.title.trim() || !newTopic.body.trim()}
                  className="px-6 py-2 bg-github-success text-white font-semibold rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
