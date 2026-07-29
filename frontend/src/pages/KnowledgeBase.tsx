import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { BookOpen, Plus, Trash2, Tag, X, Search, Pencil, Filter } from 'lucide-react';
import {
  fetchKnowledgeBase,
  createKnowledgeBaseItem,
  updateKnowledgeBaseItem,
  deleteKnowledgeBaseItem,
} from '../services/api';

export interface KBItem {
  id: number;
  title: string;
  category: 'faq' | 'pc_specs' | 'links' | 'doc';
  content: string;
}

const initialKBItems: KBItem[] = [
  {
    id: 1,
    title: 'Streaming Rig PC Specs',
    category: 'pc_specs',
    content: 'CPU: Intel i9-14900K, GPU: NVIDIA RTX 4090, RAM: 64GB DDR5, Mic: Shure SM7B',
  },
  {
    id: 2,
    title: 'Discord & Social Links',
    category: 'links',
    content: 'Join our Discord server at https://discord.gg/streamer and follow on Twitter @streamer',
  },
  {
    id: 3,
    title: 'Stream Schedule FAQ',
    category: 'faq',
    content: 'Live every Monday, Wednesday, and Friday at 6 PM EST!',
  },
];

const CATEGORY_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'faq', label: 'FAQ' },
  { id: 'pc_specs', label: 'PC Specs' },
  { id: 'links', label: 'Links' },
  { id: 'doc', label: 'Documents' },
];

export const KnowledgeBasePage: React.FC = () => {
  const [items, setItems] = useState<KBItem[]>(initialKBItems);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<'faq' | 'pc_specs' | 'links' | 'doc'>('faq');
  const [content, setContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<KBItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editCategory, setEditCategory] = useState<'faq' | 'pc_specs' | 'links' | 'doc'>('faq');
  const [editContent, setEditContent] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const data = await fetchKnowledgeBase();
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
      } catch (err) {
        console.warn('API fetchKnowledgeBase failed, maintaining current items:', err);
      }
    };
    loadItems();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    const newItemData = { title, category, content };

    try {
      const res = await createKnowledgeBaseItem(newItemData);
      const createdItem: KBItem = {
        id: res?.id || Date.now(),
        title,
        category,
        content,
      };
      setItems((prev) => [createdItem, ...prev]);
    } catch (err) {
      console.warn('API createKnowledgeBaseItem failed, saving locally:', err);
      const fallbackItem: KBItem = {
        id: Date.now(),
        title,
        category,
        content,
      };
      setItems((prev) => [fallbackItem, ...prev]);
    } finally {
      setIsSubmitting(false);
      setTitle('');
      setCategory('faq');
      setContent('');
      setIsAddModalOpen(false);
    }
  };

  const handleOpenEditModal = (item: KBItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditContent(item.content);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim() || !editContent.trim()) return;

    setIsUpdating(true);
    const updatedData = { title: editTitle, category: editCategory, content: editContent };

    try {
      await updateKnowledgeBaseItem(editingItem.id, updatedData);
    } catch (err) {
      console.warn('API updateKnowledgeBaseItem failed, updating locally:', err);
    } finally {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...item, title: editTitle, category: editCategory, content: editContent }
            : item
        )
      );
      setIsUpdating(false);
      setEditingItem(null);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await deleteKnowledgeBaseItem(id);
    } catch (err) {
      console.warn('API deleteKnowledgeBaseItem failed, deleting locally:', err);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-purple-400" />
            <span>Knowledge Base Manager</span>
          </h2>
          <p className="text-sm text-slate-400">Manage streamer FAQ, PC specs, links, and vector embeddings for RAG context.</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium text-sm flex items-center space-x-2 transition-all shadow-lg shadow-purple-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>Add KB Item</span>
        </button>
      </div>

      {/* Top Search Input & Category Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search KB titles & content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 hidden sm:inline-block" />
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === tab.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800/60 text-slate-400">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium">No Knowledge Base items match your query.</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting search filters or adding a new item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <GlassCard key={item.id} className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {item.category === 'pc_specs' ? 'PC Specs' : item.category === 'doc' ? 'Documents' : item.category}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="text-slate-500 hover:text-purple-400 transition-colors"
                      title="Edit Item"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="font-semibold text-slate-200 mb-1">{item.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-3">{item.content}</p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center space-x-1">
                <Tag className="w-3 h-3" />
                <span>Vectorized (1536 dim)</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span>Add Knowledge Base Item</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stream PC Specifications"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="faq">FAQ</option>
                  <option value="pc_specs">PC Specs</option>
                  <option value="links">Social / Links</option>
                  <option value="doc">Documentation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Intel i9-14900K, RTX 4090, 64GB RAM..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Pencil className="w-5 h-5 text-purple-400" />
                <span>Edit Knowledge Base Item</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stream PC Specifications"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as any)}
                  className="w-full bg-slate-950/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="faq">FAQ</option>
                  <option value="pc_specs">PC Specs</option>
                  <option value="links">Social / Links</option>
                  <option value="doc">Documentation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Content details..."
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Update Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
