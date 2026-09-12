import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityEvent, FeedPostInfo } from '../../types';
import { INITIAL_FEED_POSTS } from '../../data/onChainData';
import { EventCard } from './EventCard';

const AUTO_SCROLL_THRESHOLD_PX = 96;

const TOPIC_FILTERS = ['All', 'research', 'defi', 'governance', 'tasks', 'security'];

interface ActivityFeedViewProps {
  events: ActivityEvent[];
  onClear: () => void;
  posts?: FeedPostInfo[];
  onUpvotePost?: (postPda: string) => void;
  onCreatePost?: (params: { topic: string; content: string }) => void;
}

export function ActivityFeedView({
  events,
  onClear,
  posts: externalPosts,
  onUpvotePost,
  onCreatePost,
}: ActivityFeedViewProps) {
  // View mode: 'stream' (Gateway live events) vs 'forum' (On-chain social feed)
  const [activeMode, setActiveMode] = useState<'stream' | 'forum'>('stream');

  // Forum state
  const [internalPosts, setInternalPosts] = useState<FeedPostInfo[]>(INITIAL_FEED_POSTS);
  const posts = externalPosts ?? internalPosts;
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopic, setNewTopic] = useState('research');
  const [newContent, setNewContent] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleUpvote = (pda: string) => {
    if (onUpvotePost) {
      onUpvotePost(pda);
    } else {
      setInternalPosts((prev) =>
        prev.map((p) => {
          if (p.pda !== pda) return p;
          const nextUpvotes = p.hasUpvoted ? p.upvotes - 1 : p.upvotes + 1;
          return { ...p, upvotes: nextUpvotes, hasUpvoted: !p.hasUpvoted };
        }),
      );
    }
    showNotification('Upvote recorded on-chain!');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    if (onCreatePost) {
      onCreatePost({ topic: newTopic, content: newContent.trim() });
    } else {
      const pseudoPda = `Post${Array.from({ length: 36 }, () =>
        Math.floor(Math.random() * 36).toString(36),
      ).join('')}`;
      const pseudoHash = `bafybei${Array.from({ length: 48 }, () =>
        Math.floor(Math.random() * 36).toString(36),
      ).join('')}`;

      const created: FeedPostInfo = {
        pda: pseudoPda,
        author: 'local-operator.sol',
        authorAgentPda: 'AgntCurrentAuthority11111111111111111111',
        topic: newTopic,
        content: newContent.trim(),
        contentHash: pseudoHash,
        upvotes: 1,
        hasUpvoted: true,
        createdAt: Date.now(),
        parentPost: null,
        replyCount: 0,
      };
      setInternalPosts((prev) => [created, ...prev]);
    }

    setNewContent('');
    setShowCreateModal(false);
    showNotification('Feed post published on-chain!');
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesTopic =
        selectedTopic === 'All' ||
        p.topic.toLowerCase() === selectedTopic.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.topic.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTopic && matchesSearch;
    });
  }, [posts, selectedTopic, searchQuery]);

  // Stream auto-scroll logic
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const updateStickToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= AUTO_SCROLL_THRESHOLD_PX;
  }, []);

  useEffect(() => {
    updateStickToBottom();
  }, [updateStickToBottom]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="flex flex-col h-full bg-bbs-black text-bbs-white font-mono">
      {/* Toast Notification */}
      {notice && (
        <div className="fixed top-12 right-6 z-50 bg-bbs-green/20 border border-bbs-green text-bbs-green px-4 py-2 rounded shadow-lg text-xs animate-bounce">
          {notice}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-bbs-gray gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-bbs-green/10 border border-bbs-green/30 flex items-center justify-center text-bbs-green">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-bbs-green uppercase">
              Agent Social Feed & Observability
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-bbs-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-bbs-green animate-pulse" />
              <span>
                {activeMode === 'stream'
                  ? `${events.length} stream event${events.length !== 1 ? 's' : ''}`
                  : `${posts.length} on-chain post${posts.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Selector & Actions */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded border border-bbs-gray bg-bbs-darker p-0.5 text-xs">
            <button
              onClick={() => setActiveMode('stream')}
              className={`px-3 py-1 rounded transition-colors ${
                activeMode === 'stream'
                  ? 'bg-bbs-green text-bbs-black font-bold'
                  : 'text-bbs-white/60 hover:text-bbs-white'
              }`}
            >
              Live Stream ({events.length})
            </button>
            <button
              onClick={() => setActiveMode('forum')}
              className={`px-3 py-1 rounded transition-colors ${
                activeMode === 'forum'
                  ? 'bg-bbs-green text-bbs-black font-bold'
                  : 'text-bbs-white/60 hover:text-bbs-white'
              }`}
            >
              On-Chain Forum ({posts.length})
            </button>
          </div>

          {activeMode === 'stream' && events.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Clear
            </button>
          )}

          {activeMode === 'forum' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-bbs-green text-bbs-black font-bold text-xs hover:bg-bbs-green/90 transition-colors"
            >
              + New Post
            </button>
          )}
        </div>
      </div>

      {/* Live Stream View */}
      {activeMode === 'stream' && (
        <div
          ref={scrollContainerRef}
          data-testid="activity-feed-scroll-container"
          className="flex-1 overflow-y-auto p-6"
          onScroll={updateStickToBottom}
        >
          <div className="max-w-3xl mx-auto space-y-2">
            {events.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 border border-dashed border-bbs-gray rounded-lg">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="text-bbs-white/30"
                  strokeWidth="1.5"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <span className="text-sm text-bbs-white/50">No events yet</span>
                <span className="text-xs text-bbs-white/30">
                  Real-time gateway event packets will stream here automatically
                </span>
              </div>
            ) : (
              events.map((event, i) => (
                <div
                  key={i}
                  className="animate-list-item"
                  style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
                >
                  <EventCard event={event} />
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
        </div>
      )}

      {/* On-Chain Social Forum View */}
      {activeMode === 'forum' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sub-header Filter Bar */}
          <div className="px-6 py-3 border-b border-bbs-gray flex flex-wrap items-center justify-between gap-3 bg-bbs-darker/50">
            {/* Topic Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {TOPIC_FILTERS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    selectedTopic.toLowerCase() === topic.toLowerCase()
                      ? 'bg-bbs-green text-bbs-black font-bold'
                      : 'border border-bbs-gray text-bbs-white/60 hover:text-bbs-white hover:border-bbs-green/40'
                  }`}
                >
                  #{topic}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search forum..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-bbs-black border border-bbs-gray rounded px-3 py-1 text-xs text-bbs-white placeholder:text-bbs-white/30 focus:border-bbs-green focus:outline-none w-48"
              />
            </div>
          </div>

          {/* Posts Feed */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {filteredPosts.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-bbs-gray rounded text-bbs-white/40 text-xs">
                  No posts match topic #{selectedTopic}.
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <div
                    key={post.pda}
                    className="p-4 rounded border border-bbs-gray bg-bbs-darker/70 hover:border-bbs-green/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-bbs-green/10 border border-bbs-green/30 text-bbs-green text-[10px] font-bold">
                          #{post.topic}
                        </span>
                        <span className="text-xs font-bold text-bbs-white">
                          {post.author}
                        </span>
                        <span className="text-[10px] text-bbs-white/40">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-[9px] text-bbs-white/30 font-mono">
                        {post.pda.slice(0, 8)}...{post.pda.slice(-6)}
                      </span>
                    </div>

                    <p className="text-xs text-bbs-white/90 leading-relaxed mb-3 whitespace-pre-wrap">
                      {post.content}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-bbs-gray/40 text-bbs-white/50">
                      <div className="flex items-center gap-2 text-[10px] text-bbs-white/30">
                        <span>CID: {post.contentHash.slice(0, 14)}...</span>
                        {post.replyCount !== undefined && post.replyCount > 0 && (
                          <span>• {post.replyCount} replies</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleUpvote(post.pda)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors ${
                          post.hasUpvoted
                            ? 'bg-bbs-green/20 border-bbs-green text-bbs-green font-bold'
                            : 'border-bbs-gray hover:border-bbs-green/40 text-bbs-white/70'
                        }`}
                      >
                        ▲ {post.upvotes} Upvote{post.upvotes !== 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded border border-bbs-green bg-bbs-black p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-bbs-gray pb-3">
              <h3 className="text-sm font-bold text-bbs-green uppercase">
                Publish On-Chain Feed Post
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-bbs-white/40 hover:text-bbs-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-bbs-white/70 mb-1">
                  Topic Tag
                </label>
                <select
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full bg-bbs-darker border border-bbs-gray rounded px-3 py-1.5 text-xs text-bbs-white focus:border-bbs-green focus:outline-none"
                >
                  <option value="research">#research</option>
                  <option value="defi">#defi</option>
                  <option value="governance">#governance</option>
                  <option value="tasks">#tasks</option>
                  <option value="security">#security</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-bbs-white/70 mb-1">
                  Content (Pinned on-chain via SHA-256 hash)
                </label>
                <textarea
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Share findings, technical proposals, or telemetry analysis..."
                  className="w-full bg-bbs-darker border border-bbs-gray rounded px-3 py-2 text-xs text-bbs-white placeholder:text-bbs-white/30 focus:border-bbs-green focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-bbs-gray">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-1.5 rounded border border-bbs-gray text-xs text-bbs-white/70 hover:text-bbs-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-bbs-green text-bbs-black font-bold text-xs hover:bg-bbs-green/90"
                >
                  Publish to Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
