import React, { useEffect, useState, useMemo } from 'react';
import { 
  StickyNote, Pin, Trash2, Edit3, Plus, Search, 
  Clock, Tag, Check, X, AlertCircle, RefreshCw,
  MoreVertical, ExternalLink, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchCollection, saveCollection, deleteDocument, COLLECTIONS } from '../lib/firestoreApi';

const CATEGORIES = ['General', 'Shopee', 'TikTok', 'Draft', 'Supplier'];

const NoteModal = ({ isOpen, onClose, onSave, note = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    pinned: false
  });

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title || '',
        content: note.content || '',
        category: note.category || 'General',
        pinned: note.pinned || false
      });
    } else {
      setFormData({ title: '', content: '', category: 'General', pinned: false });
    }
  }, [note, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#1a1a1a] w-full max-w-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <StickyNote className="text-blue-400 w-5 h-5" />
            {note ? 'Edit Note' : 'Create New Memo'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</label>
            <input 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="Give your note a header..."
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
              <div className="relative">
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full appearance-none bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pinned Status</label>
              <button 
                onClick={() => setFormData({...formData, pinned: !formData.pinned})}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  formData.pinned ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-[#0a0a0a] border-white/10 text-gray-400'
                }`}
              >
                <span className="text-sm font-medium">{formData.pinned ? 'Pinned to Top' : 'Standard Note'}</span>
                <Pin className={`w-4 h-4 ${formData.pinned ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Content</label>
            <textarea 
              rows={6}
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              placeholder="Write your thoughts here..."
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-6 bg-black/20 border-t border-white/5 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
          >
            {note ? 'Update Note' : 'Create Note'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async (force = false) => {
    setLoading(true);
    const data = await fetchCollection(COLLECTIONS.notes, force);
    setNotes(data || []);
    setLoading(false);
  };

  const handleSaveNote = async (formData) => {
    try {
      setLoading(true);
      const now = new Date();
      const noteToSave = {
        ...formData,
        lastEdited: now,
        createdAt: editingNote ? editingNote.createdAt : now,
        _docId: editingNote ? editingNote._docId : undefined
      };

      await saveCollection(COLLECTIONS.notes, [noteToSave]);
      await loadNotes(); // Refresh from cache
      setIsModalOpen(false);
      setEditingNote(null);
    } catch (error) {
      console.error('Failed to save note', error);
      alert('Error saving note. Check permissions or network.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this note permanentely?')) return;
    try {
      await deleteDocument(COLLECTIONS.notes, docId);
      setNotes(prev => prev.filter(n => n._docId !== docId));
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  const handleTogglePin = async (note) => {
    const updated = { ...note, pinned: !note.pinned, lastEdited: new Date() };
    await saveCollection(COLLECTIONS.notes, [updated]);
    setNotes(prev => prev.map(n => n._docId === note._docId ? updated : n));
  };

  const filteredNotes = useMemo(() => {
    return notes
      .filter(n => {
        const matchesSearch = (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (n.content || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = filterCategory === 'All' || n.category === filterCategory;
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => {
        // Pinned first
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        // Then by creation date (newest first)
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
  }, [notes, searchTerm, filterCategory]);

  const getCategoryColor = (cat) => {
    switch(cat) {
      case 'Shopee': return 'border-orange-500/40 text-orange-400 bg-orange-500/5';
      case 'TikTok': return 'border-gray-400/40 text-gray-300 bg-gray-400/5';
      case 'Supplier': return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5';
      case 'Draft': return 'border-purple-500/40 text-purple-400 bg-purple-500/5';
      default: return 'border-blue-500/40 text-blue-400 bg-blue-500/5';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-5 md:space-y-8 min-h-screen pb-20">
      {/* ── Header Area ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Memo Board
            <span className="text-xs font-normal px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-gray-500">
              {notes.length} saved
            </span>
          </h1>
          <p className="text-gray-400 mt-1 md:mt-2 text-sm md:text-lg">Your workspace for quick ideas, reminders, and cloud-synced notes.</p>
        </div>
        <button 
          onClick={() => { setEditingNote(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 w-full md:w-auto px-8 py-3 md:py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Plus size={24} /> New Memo
        </button>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3 md:gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Search keywords, titles, or content..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#141414] border border-white/5 rounded-2xl pl-12 pr-4 py-3 md:py-4 text-white outline-none focus:border-blue-500/30 transition-all shadow-inner"
          />
        </div>
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 md:px-6 py-2.5 md:py-4 rounded-2xl text-sm md:text-base font-semibold whitespace-nowrap transition-all border ${
                filterCategory === cat 
                  ? 'bg-white text-black border-white' 
                  : 'bg-[#141414] text-gray-400 border-white/5 hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
          <button 
            onClick={() => loadNotes(true)}
            className="p-2.5 md:p-4 bg-[#141414] border border-white/5 rounded-2xl text-gray-400 hover:text-white hover:border-blue-500/30 transition-all shrink-0"
            title="Sync from Cloud"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
          </button>
        </div>
      </div>

      {/* ── Notes Grid ─────────────────────────────────────────── */}
      {loading && notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40">
           <RefreshCw className="animate-spin text-blue-500 w-10 h-10 mb-4" />
           <p className="text-gray-500 font-medium">Loading your memos...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="flex flex-col items-center justify-center py-40 bg-[#141414] rounded-3xl border border-dashed border-white/10"
        >
          <StickyNote className="w-16 h-16 text-gray-700 mb-4" />
          <h3 className="text-xl font-bold text-gray-400">No notes found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search or category filter.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          <AnimatePresence>
            {filteredNotes.map((note) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={note._docId}
                className={`group relative bg-[#141414] rounded-3xl p-6 border transition-all hover:shadow-2xl hover:shadow-black/50 ${
                  note.pinned ? 'border-amber-500/30 bg-amber-500/[0.02]' : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Pin Badge */}
                {note.pinned && (
                  <div className="absolute -top-3 -right-2 bg-amber-500 text-black p-1.5 rounded-full shadow-lg">
                    <Pin size={14} className="fill-current" />
                  </div>
                )}

                {/* Category Badge */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border ${getCategoryColor(note.category)}`}>
                  <Tag size={10} />
                  {note.category}
                </div>

                {/* Content */}
                <div className="space-y-3 cursor-pointer" onClick={() => { setEditingNote(note); setIsModalOpen(true); }}>
                  <h3 className="text-xl font-bold text-white line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">
                    {note.title || 'Untitled Memo'}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex items-center gap-1.5 text-gray-600 text-[10px] font-medium">
                    <Clock size={12} />
                    {formatDate(note.lastEdited || note.createdAt)}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleTogglePin(note)}
                      className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-amber-500 transition-all"
                      title={note.pinned ? "Unpin" : "Pin to Top"}
                    >
                      <Pin size={16} className={note.pinned ? 'fill-current' : ''} />
                    </button>
                    <button 
                      onClick={() => { setEditingNote(note); setIsModalOpen(true); }}
                      className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-blue-500 transition-all"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(note._docId)}
                      className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-red-500 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────────── */}
      <NoteModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingNote(null); }}
        onSave={handleSaveNote}
        note={editingNote}
      />
    </div>
  );
};

export default Dashboard;
