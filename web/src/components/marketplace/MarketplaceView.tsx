import { useState, useMemo } from 'react';
import type { MarketplaceSkill } from '../../types';

interface MarketplaceViewProps {
  skills: MarketplaceSkill[];
  onRefresh?: () => void;
  onPurchase?: (skill: MarketplaceSkill) => void;
  onRate?: (skillId: string, rating: number, review?: string) => void;
  onPublish?: (params: {
    name: string;
    description: string;
    tags: string[];
    priceSol: string;
    content: string;
  }) => void;
}

const TAG_FILTERS = ['All', 'DeFi', 'AI', 'ZK', 'Data', 'Security', 'Tools'];

export function MarketplaceView({
  skills,
  onRefresh,
  onPurchase,
  onRate,
  onPublish,
}: MarketplaceViewProps) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'price'>('rating');

  // Modals state
  const [purchaseTarget, setPurchaseTarget] = useState<MarketplaceSkill | null>(null);
  const [rateTarget, setRateTarget] = useState<MarketplaceSkill | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);

  // New Skill form state
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillTags, setNewSkillTags] = useState('DeFi, Tools');
  const [newSkillPrice, setNewSkillPrice] = useState('0.05');
  const [newSkillContent, setNewSkillContent] = useState('# Custom Skill\nDescription of capability.');

  // Notification message
  const [notification, setNotification] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredSkills = useMemo(() => {
    return skills
      .filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase()) ||
          s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

        const matchesTag =
          selectedTag === 'All' ||
          s.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

        return matchesSearch && matchesTag;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'downloads') return b.downloads - a.downloads;
        if (sortBy === 'price')
          return parseFloat(a.priceSol) - parseFloat(b.priceSol);
        return 0;
      });
  }, [skills, search, selectedTag, sortBy]);

  const handleConfirmPurchase = () => {
    if (!purchaseTarget) return;
    if (onPurchase) {
      onPurchase(purchaseTarget);
    }
    showNotice(`Purchased "${purchaseTarget.name}" for ${purchaseTarget.priceSol} SOL.`);
    setPurchaseTarget(null);
  };

  const handleConfirmRate = () => {
    if (!rateTarget) return;
    if (onRate) {
      onRate(rateTarget.id, ratingValue, reviewText);
    }
    showNotice(`Rated "${rateTarget.name}" ${ratingValue}★.`);
    setRateTarget(null);
    setReviewText('');
  };

  const handleConfirmPublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    if (onPublish) {
      onPublish({
        name: newSkillName,
        description: newSkillDesc,
        tags: newSkillTags.split(',').map((t) => t.trim()).filter(Boolean),
        priceSol: newSkillPrice,
        content: newSkillContent,
      });
    }

    showNotice(`Published skill "${newSkillName}" to marketplace.`);
    setShowPublishModal(false);
    setNewSkillName('');
    setNewSkillDesc('');
  };

  return (
    <div className="flex flex-col h-full bg-bbs-black text-bbs-white overflow-y-auto">
      {/* Header Banner */}
      <div className="border-b border-bbs-purple-dim bg-bbs-surface px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-bbs-purple text-lg font-bold">🛒</span>
            <h1 className="text-base font-bold glossy-text-shine tracking-wide font-heading">
              ON-CHAIN SKILL MARKETPLACE
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-bbs-purple-dim text-bbs-purple font-mono">
              SOLANA
            </span>
          </div>
          <p className="text-xs text-bbs-gray mt-1">
            Browse, purchase, and verify cryptographic skill modules for autonomous agents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 text-xs bg-bbs-purple-dim text-bbs-lightgray hover:text-bbs-white rounded border border-bbs-purple transition-colors"
            >
              ↻ Refresh
            </button>
          )}
          <button
            onClick={() => setShowPublishModal(true)}
            className="px-3 py-1.5 text-xs bg-bbs-purple text-bbs-black font-bold rounded hover:opacity-90 transition-opacity"
          >
            + Publish Skill
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="mx-6 mt-3 px-4 py-2 bg-bbs-purple text-bbs-black text-xs font-bold rounded flex items-center justify-between animate-pulse">
          <span>✓ {notification}</span>
          <button onClick={() => setNotification(null)} className="font-mono">✕</button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="px-6 py-3 border-b border-white/[0.08] flex flex-wrap items-center gap-3 bg-[#07080f]/95 backdrop-blur-xl">
        <div className="relative flex-1 min-w-[220px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5 text-[#ffaa33]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills, tags, authors..."
            className="w-full bg-[#10121c]/90 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ffaa33]/70 focus:shadow-[0_0_16px_rgba(255,119,0,0.2)] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {TAG_FILTERS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 whitespace-nowrap ${
                selectedTag === tag
                  ? 'bg-gradient-to-r from-[#FF7700] to-[#FFAA22] text-[#06070a] font-bold shadow-[0_2px_12px_rgba(255,119,0,0.35)]'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#10121c] border border-white/10 hover:border-[#ffaa33]/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ffaa33] transition-colors cursor-pointer"
          >
            <option value="rating">Top Rated</option>
            <option value="downloads">Most Downloaded</option>
            <option value="price">Lowest Price</option>
          </select>
        </div>
      </div>

      {/* Grid of Skill Cards */}
      <div className="p-6 flex-1">
        {filteredSkills.length === 0 ? (
          <div className="text-center py-12 text-bbs-gray text-sm">
            No skills match your filters. Try clearing search or publish the first skill!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className="bg-bbs-surface border border-bbs-purple-dim rounded-lg p-4 flex flex-col justify-between hover:border-bbs-purple transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-bbs-white">
                        {skill.name}
                      </h3>
                      <div className="text-[11px] text-bbs-gray font-mono mt-0.5">
                        v{skill.version} • by {skill.author.slice(0, 4)}...{skill.author.slice(-4)}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bbs-purple-dim text-bbs-purple">
                      {parseFloat(skill.priceSol) === 0 ? 'FREE' : `${skill.priceSol} SOL`}
                    </span>
                  </div>

                  <p className="text-xs text-bbs-lightgray mt-2.5 line-clamp-2">
                    {skill.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {skill.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-bbs-black border border-bbs-purple-dim text-bbs-gray px-1.5 py-0.5 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-bbs-purple-dim flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-bbs-gray">
                    <span className="text-amber-400 font-bold">★ {skill.rating.toFixed(1)}</span>
                    <span className="text-[10px]">({skill.ratingCount})</span>
                    <span>•</span>
                    <span className="text-[10px]">📥 {skill.downloads}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRateTarget(skill)}
                      className="px-2 py-1 text-[11px] text-bbs-gray hover:text-bbs-white rounded border border-bbs-purple-dim hover:border-bbs-purple transition-colors"
                      title="Rate Skill"
                    >
                      Rate
                    </button>
                    <button
                      onClick={() => setPurchaseTarget(skill)}
                      className="px-2.5 py-1 text-[11px] bg-bbs-purple text-bbs-black font-bold rounded hover:opacity-90 transition-opacity"
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {purchaseTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-bbs-surface border border-bbs-purple rounded-lg max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-bbs-purple-dim pb-3">
              <h2 className="text-sm font-bold text-bbs-white">Confirm Skill Purchase</h2>
              <button onClick={() => setPurchaseTarget(null)} className="text-bbs-gray hover:text-bbs-white">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-bbs-gray">Skill Name:</span>
                <span className="font-bold text-bbs-white">{purchaseTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bbs-gray">Skill ID:</span>
                <span className="font-mono text-bbs-purple">{purchaseTarget.id.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bbs-gray">Price:</span>
                <span className="font-bold text-bbs-white">{purchaseTarget.priceSol} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bbs-gray">Author Agent PDA:</span>
                <span className="font-mono text-bbs-gray">{purchaseTarget.authorAgentPda.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bbs-gray">Content Hash:</span>
                <span className="font-mono text-[10px] text-bbs-gray">{purchaseTarget.contentHash.slice(0, 20)}...</span>
              </div>
            </div>

            <div className="p-3 bg-bbs-black rounded border border-bbs-purple-dim text-[11px] text-bbs-gray">
              Purchasing this skill creates an immutable on-chain entitlement record allowing automatic download, execution, and rating verification.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPurchaseTarget(null)}
                className="px-3 py-1.5 text-xs text-bbs-gray hover:text-bbs-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="px-4 py-1.5 text-xs bg-bbs-purple text-bbs-black font-bold rounded hover:opacity-90"
              >
                Confirm & Pay ({purchaseTarget.priceSol} SOL)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Modal */}
      {rateTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-bbs-surface border border-bbs-purple rounded-lg max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-bbs-purple-dim pb-3">
              <h2 className="text-sm font-bold text-bbs-white">Rate Skill: {rateTarget.name}</h2>
              <button onClick={() => setRateTarget(null)} className="text-bbs-gray hover:text-bbs-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-bbs-gray mb-1.5">Rating (1 to 5 Stars):</label>
                <div className="flex gap-2 text-xl cursor-pointer">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => setRatingValue(star)}
                      className={star <= ratingValue ? 'text-amber-400' : 'text-bbs-gray'}
                    >
                      ★
                    </span>
                  ))}
                  <span className="text-sm text-bbs-white ml-2 self-center font-bold">
                    {ratingValue} / 5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-bbs-gray mb-1">Optional Review:</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience using this skill..."
                  rows={3}
                  className="w-full bg-bbs-black border border-bbs-purple-dim rounded p-2 text-xs text-bbs-white focus:outline-none focus:border-bbs-purple"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRateTarget(null)}
                className="px-3 py-1.5 text-xs text-bbs-gray hover:text-bbs-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRate}
                className="px-4 py-1.5 text-xs bg-bbs-purple text-bbs-black font-bold rounded hover:opacity-90"
              >
                Submit On-Chain Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Skill Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleConfirmPublish} className="bg-bbs-surface border border-bbs-purple rounded-lg max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-bbs-purple-dim pb-3">
              <h2 className="text-sm font-bold text-bbs-white">Publish Skill to Marketplace</h2>
              <button type="button" onClick={() => setShowPublishModal(false)} className="text-bbs-gray hover:text-bbs-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-bbs-gray mb-1">Skill Name *</label>
                <input
                  type="text"
                  required
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. Jupiter Swap Pro"
                  className="w-full bg-bbs-black border border-bbs-purple-dim rounded px-3 py-1.5 text-bbs-white focus:outline-none focus:border-bbs-purple"
                />
              </div>

              <div>
                <label className="block text-bbs-gray mb-1">Description</label>
                <input
                  type="text"
                  value={newSkillDesc}
                  onChange={(e) => setNewSkillDesc(e.target.value)}
                  placeholder="Brief summary of what this skill does"
                  className="w-full bg-bbs-black border border-bbs-purple-dim rounded px-3 py-1.5 text-bbs-white focus:outline-none focus:border-bbs-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bbs-gray mb-1">Price (SOL)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={newSkillPrice}
                    onChange={(e) => setNewSkillPrice(e.target.value)}
                    className="w-full bg-bbs-black border border-bbs-purple-dim rounded px-3 py-1.5 text-bbs-white focus:outline-none focus:border-bbs-purple"
                  />
                </div>
                <div>
                  <label className="block text-bbs-gray mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newSkillTags}
                    onChange={(e) => setNewSkillTags(e.target.value)}
                    placeholder="DeFi, Swaps"
                    className="w-full bg-bbs-black border border-bbs-purple-dim rounded px-3 py-1.5 text-bbs-white focus:outline-none focus:border-bbs-purple"
                  />
                </div>
              </div>

              <div>
                <label className="block text-bbs-gray mb-1">SKILL.md Content</label>
                <textarea
                  rows={4}
                  value={newSkillContent}
                  onChange={(e) => setNewSkillContent(e.target.value)}
                  className="w-full font-mono bg-bbs-black border border-bbs-purple-dim rounded p-2 text-[11px] text-bbs-white focus:outline-none focus:border-bbs-purple"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-3 py-1.5 text-xs text-bbs-gray hover:text-bbs-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs bg-bbs-purple text-bbs-black font-bold rounded hover:opacity-90"
              >
                Publish On-Chain
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
