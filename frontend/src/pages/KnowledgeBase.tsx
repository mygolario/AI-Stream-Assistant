import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Trash2, Tag, X, Pencil } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import {
  fetchKnowledgeBase,
  createKnowledgeBaseItem,
  updateKnowledgeBaseItem,
  deleteKnowledgeBaseItem,
} from '../services/api';

export interface KBItem {
  id: string;
  title: string;
  category: string;
  content: string;
}

const initialKBItems: KBItem[] = [
  { id: '1', title: 'What GPU do you use?', category: 'faq', content: 'I use an RTX 4090 Founders Edition with custom watercooling.' },
  { id: '2', title: 'PC Specs', category: 'pc_specs', content: 'CPU: Ryzen 9 7950X | RAM: 64GB DDR5-6000 | GPU: RTX 4090 | SSD: 2x 2TB Samsung 990 Pro' },
  { id: '3', title: 'Discord Server', category: 'links', content: 'Join the community: https://discord.gg/streamer' },
  { id: '4', title: 'Stream Schedule', category: 'faq', content: 'I stream Mon/Wed/Fri 8PM EST and Saturdays all day!' },
  { id: '5', title: 'Keyboard & Mouse', category: 'pc_specs', content: 'Keyboard: Wooting 60HE | Mouse: Razer Viper V3 Pro' },
  { id: '6', title: 'Chat Rules', category: 'doc', content: 'Be respectful, no spam, no self-promotion, English only in chat.' },
];

const categories = [
  { id: 'all', label: 'All' },
  { id: 'faq', label: 'FAQ' },
  { id: 'pc_specs', label: 'PC Specs' },
  { id: 'links', label: 'Links' },
  { id: 'doc', label: 'Documents' },
];

const categoryBadgeVariant = (cat: string) => {
  switch (cat) {
    case 'faq': return 'blue' as const;
    case 'pc_specs': return 'amber' as const;
    case 'links': return 'emerald' as const;
    case 'doc': return 'default' as const;
    default: return 'default' as const;
  }
};

export const KnowledgeBasePage: React.FC = () => {
  const [items, setItems] = useState<KBItem[]>(initialKBItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('faq');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<KBItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchKnowledgeBase();
        if (Array.isArray(res) && res.length > 0) setItems(res);
      } catch {}
    };
    load();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await createKnowledgeBaseItem({ title, category, content });
      if (res?.id) {
        setItems((prev) => [res, ...prev]);
      } else {
        const newItem: KBItem = { id: Date.now().toString(), title, category, content };
        setItems((prev) => [newItem, ...prev]);
      }
    } catch {
      const newItem: KBItem = { id: Date.now().toString(), title, category, content };
      setItems((prev) => [newItem, ...prev]);
    }
    setTitle(''); setCategory('faq'); setContent('');
    setIsAddModalOpen(false);
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const numericId = Number.parseInt(id, 10);
    if (!Number.isNaN(numericId)) {
      try { await deleteKnowledgeBaseItem(numericId); } catch {}
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const openEdit = (item: KBItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditContent(item.content);
  };

  const handleUpdate = async () => {
    if (!editingItem || !editTitle.trim() || !editContent.trim()) return;
    setIsUpdating(true);
    const updated = { title: editTitle, category: editCategory, content: editContent };
    try {
      const numericId = Number.parseInt(editingItem.id, 10);
      if (!Number.isNaN(numericId)) {
        await updateKnowledgeBaseItem(numericId, updated);
      }
    } catch {}
    setItems((prev) => prev.map((i) => i.id === editingItem.id ? { ...i, ...updated } : i));
    setEditingItem(null);
    setIsUpdating(false);
  };

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading text-text-primary flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-blue" />
            Knowledge Base
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            RAG context items for AI-powered viewer Q&A
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Item
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="w-72">
          <Input
            variant="search"
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150
                ${selectedCategory === cat.id
                  ? 'bg-accent-blue-muted text-accent-blue'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
                }
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              layout
            >
              <Card variant="interactive" padding="md" className="group relative">
                {/* Actions */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 rounded-md hover:bg-surface-2 text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-md hover:bg-accent-rose-muted text-text-tertiary hover:text-accent-rose transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Content */}
                <Badge variant={categoryBadgeVariant(item.category)} className="mb-3">
                  <Tag className="w-3 h-3" />
                  {categories.find(c => c.id === item.category)?.label || item.category}
                </Badge>
                <h4 className="text-sm font-medium text-text-primary mb-1.5 pr-14">
                  {item.title}
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                  {item.content}
                </p>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="col-span-full py-12 text-center text-text-tertiary text-sm">
            No items found. Try adjusting your search or filters.
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div className="bg-surface-1 border border-border rounded-xl shadow-modal p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Add Knowledge Base Item</h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-surface-2 rounded-md text-text-tertiary">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <Input label="Title" placeholder="e.g. What GPU do you use?" value={title} onChange={(e) => setTitle(e.target.value)} />

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
                    <option value="faq">FAQ</option>
                    <option value="pc_specs">PC Specs</option>
                    <option value="links">Links</option>
                    <option value="doc">Document</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="The answer or information..."
                    rows={4}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="md" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button variant="primary" size="md" loading={isSubmitting} onClick={handleAdd}>Add Item</Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => setEditingItem(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div className="bg-surface-1 border border-border rounded-xl shadow-modal p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Edit Item</h3>
                  <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-surface-2 rounded-md text-text-tertiary">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">Category</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full">
                    <option value="faq">FAQ</option>
                    <option value="pc_specs">PC Specs</option>
                    <option value="links">Links</option>
                    <option value="doc">Document</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">Content</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="md" onClick={() => setEditingItem(null)}>Cancel</Button>
                  <Button variant="primary" size="md" loading={isUpdating} onClick={handleUpdate}>Save Changes</Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
};
