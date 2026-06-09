import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Tag, X, Save } from 'lucide-react';
import { getTags, createTag, updateTag, deleteTag } from '../api';

export default function TagsManager() {
  const [tags, setTags] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [name, setName] = useState('');

  useEffect(() => { loadTags(); }, []);

  const loadTags = async () => {
    try {
      const t = await getTags();
      setTags(t);
    } catch (e) { console.error(e); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editingTag) {
        await updateTag(editingTag.id, { name: name.trim() });
      } else {
        await createTag({ name: name.trim() });
      }
      setShowForm(false);
      setEditingTag(null);
      setName('');
      loadTags();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this tag?')) return;
    try { await deleteTag(id); loadTags(); } catch (e) { console.error(e); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tags</h2>
        <button
          onClick={() => { setShowForm(true); setEditingTag(null); setName(''); }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> New Tag
        </button>
      </div>

      {showForm && (
        <div className="card p-4 mb-4">
          <form onSubmit={handleSave} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tag Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary text-sm flex items-center gap-1">
              <Save className="w-3 h-3" /> {editingTag ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingTag(null); }} className="btn-secondary text-sm flex items-center gap-1">
              <X className="w-3 h-3" /> Cancel
            </button>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {tags.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No tags yet. Create tags to categorize your time entries.</div>
        )}
        {tags.map(tag => (
          <div key={tag.id} className="card p-4 flex items-center gap-3">
            <Tag className="w-4 h-4 text-gray-400" />
            <p className="flex-1 font-medium text-gray-900 dark:text-white">{tag.name}</p>
            <button onClick={() => handleEdit(tag)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(tag.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
