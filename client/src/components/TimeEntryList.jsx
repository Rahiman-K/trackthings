import React, { useState, useEffect } from 'react';
import { Clock, Copy, Trash2, Edit3, Tag, Save, X } from 'lucide-react';
import { getTimeEntries, updateTimeEntry, duplicateTimeEntry, deleteTimeEntry, getProjects, getTags, setEntryTags } from '../api';

export default function TimeEntryList({ refreshKey }) {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [e, p, t] = await Promise.all([getTimeEntries(14), getProjects(), getTags()]);
      setEntries(e);
      setProjects(p);
      setTags(t);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const groupByDay = (entries) => {
    const groups = {};
    for (const entry of entries) {
      const day = entry.started_at.split('T')[0];
      if (!groups[day]) groups[day] = { date: day, entries: [], totalSeconds: 0 };
      groups[day].entries.push(entry);
      groups[day].totalSeconds += entry.total_elapsed || 0;
    }
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setEditForm({
      description: entry.description || '',
      project_id: entry.project_id || '',
      is_billable: !!entry.is_billable,
      started_at: entry.started_at ? entry.started_at.slice(0, 16) : '',
      ended_at: entry.ended_at ? entry.ended_at.slice(0, 16) : '',
      tag_ids: (entry.tags || []).map(t => t.id),
    });
  };

  const handleSaveEdit = async () => {
    try {
      await updateTimeEntry(editingId, {
        description: editForm.description,
        project_id: editForm.project_id || null,
        is_billable: editForm.is_billable,
        started_at: editForm.started_at ? new Date(editForm.started_at).toISOString() : undefined,
        ended_at: editForm.ended_at ? new Date(editForm.ended_at).toISOString() : undefined,
        tag_ids: editForm.tag_ids,
      });
      setEditingId(null);
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleDuplicate = async (id) => {
    try {
      await duplicateTimeEntry(id);
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this time entry?')) return;
    try {
      await deleteTimeEntry(id);
      loadData();
    } catch (e) { console.error(e); }
  };

  const grouped = groupByDay(entries);

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading entries...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No time entries yet. Start tracking!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(group => (
        <div key={group.date} className="card p-0 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {new Date(group.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
              Total: {formatDuration(group.totalSeconds)}
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {group.entries.map(entry => (
              <div key={entry.id} className="px-4 py-3">
                {editingId === entry.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Description"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={editForm.project_id}
                        onChange={e => setEditForm({ ...editForm, project_id: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">No Project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input
                        type="datetime-local"
                        value={editForm.started_at}
                        onChange={e => setEditForm({ ...editForm, started_at: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="datetime-local"
                        value={editForm.ended_at}
                        onChange={e => setEditForm({ ...editForm, ended_at: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} className="btn-primary text-sm flex items-center gap-1">
                        <Save className="w-3 h-3" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary text-sm flex items-center gap-1">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {entry.description || entry.task_title || 'No description'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {entry.project_name && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: (entry.project_color || '#3b82f6') + '20', color: entry.project_color || '#3b82f6' }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.project_color || '#3b82f6' }}></span>
                            {entry.project_name}
                          </span>
                        )}
                        {(entry.tags || []).map(tag => (
                          <span key={tag.id} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTime(entry.started_at)} - {formatTime(entry.ended_at)}
                    </div>
                    <div className="font-mono text-sm font-medium text-gray-900 dark:text-white min-w-[72px] text-right">
                      {formatDuration(entry.total_elapsed)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(entry)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Edit">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDuplicate(entry.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Duplicate">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-500" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
