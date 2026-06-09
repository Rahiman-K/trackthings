import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { createTask, updateTask, getProjects } from '../api';

export default function TaskModal({ task, onClose, onSaved, defaultDate }) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [plannedHours, setPlannedHours] = useState(task ? Math.floor((task.planned_duration || 0) / 3600) : 0);
  const [plannedMinutes, setPlannedMinutes] = useState(task ? Math.floor(((task.planned_duration || 0) % 3600) / 60) : 30);
  const [scheduledDate, setScheduledDate] = useState(task?.scheduled_date || defaultDate);
  const [scheduledTime, setScheduledTime] = useState(task?.scheduled_time || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [projectId, setProjectId] = useState(task?.project_id || '');
  const [projects, setProjects] = useState([]);
  const [checklist, setChecklist] = useState(task?.checklist || []);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProjects().then(setProjects).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    const planned_duration = (plannedHours * 3600) + (plannedMinutes * 60);

    try {
      if (task) {
        await updateTask(task.id, {
          title: title.trim(),
          description: description.trim(),
          planned_duration,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime || null,
          priority,
          project_id: projectId || null,
        });
      } else {
        await createTask({
          title: title.trim(),
          description: description.trim(),
          planned_duration,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime || null,
          priority,
          project_id: projectId || null,
          checklist: checklist.map(c => ({ title: c.title })),
        });
      }
      onSaved();
    } catch (err) {
      console.error('Failed to save task:', err);
    }
    setSaving(false);
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklist([...checklist, { id: Date.now(), title: newCheckItem.trim(), is_completed: 0 }]);
    setNewCheckItem('');
  };

  const removeCheckItem = (index) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to accomplish?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details or notes..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          {/* Planned Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Planned Duration</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="23"
                value={plannedHours}
                onChange={(e) => setPlannedHours(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-500">hours</span>
              <input
                type="number"
                min="0"
                max="59"
                step="5"
                value={plannedMinutes}
                onChange={(e) => setPlannedMinutes(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-500">minutes</span>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time (optional)</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    priority === p
                      ? p === 'high' ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
                        : p === 'medium' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                        : 'bg-green-100 text-green-700 ring-2 ring-green-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">No Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Checklist */}
          {!task && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Checklist</label>
              <div className="space-y-2">
                {checklist.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                      {item.title}
                    </span>
                    <button type="button" onClick={() => removeCheckItem(index)} className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCheckItem())}
                    placeholder="Add checklist item..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  />
                  <button type="button" onClick={addCheckItem} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !title.trim()} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
