import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Briefcase, Users, X, Save } from 'lucide-react';
import { getProjects, createProject, updateProject, deleteProject, getClients, createClient, updateClient, deleteClient } from '../api';
import TagsManager from './TagsManager';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'];

export default function ProjectsView() {
  const [tab, setTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#3b82f6', client_id: '', billable_rate: 0, is_billable: false });
  const [clientForm, setClientForm] = useState({ name: '' });
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [p, c] = await Promise.all([getProjects(), getClients()]);
      setProjects(p);
      setClients(c);
    } catch (e) { console.error(e); }
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateProject(editingItem.id, form);
      } else {
        await createProject(form);
      }
      setShowForm(false);
      setEditingItem(null);
      setForm({ name: '', color: '#3b82f6', client_id: '', billable_rate: 0, is_billable: false });
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleEditProject = (project) => {
    setEditingItem(project);
    setForm({
      name: project.name,
      color: project.color || '#3b82f6',
      client_id: project.client_id || '',
      billable_rate: project.billable_rate || 0,
      is_billable: !!project.is_billable,
    });
    setShowForm(true);
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Delete this project? Tasks and entries will be unlinked.')) return;
    try { await deleteProject(id); loadData(); } catch (e) { console.error(e); }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateClient(editingClient.id, clientForm);
      } else {
        await createClient(clientForm);
      }
      setShowClientForm(false);
      setEditingClient(null);
      setClientForm({ name: '' });
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setClientForm({ name: client.name });
    setShowClientForm(true);
  };

  const handleDeleteClient = async (id) => {
    if (!confirm('Delete this client?')) return;
    try { await deleteClient(id); loadData(); } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'projects', label: 'Projects', icon: Briefcase },
          { id: 'clients', label: 'Clients', icon: Users },
          { id: 'tags', label: 'Tags', icon: null },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Projects Tab */}
      {tab === 'projects' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h2>
            <button
              onClick={() => { setShowForm(true); setEditingItem(null); setForm({ name: '', color: '#3b82f6', client_id: '', billable_rate: 0, is_billable: false }); }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>

          {showForm && (
            <div className="card p-4 mb-4">
              <form onSubmit={handleSaveProject} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                    <div className="flex gap-1">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setForm({ ...form, color: c })}
                          className={`w-6 h-6 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
                    <select
                      value={form.client_id}
                      onChange={e => setForm({ ...form, client_id: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">No Client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-sm flex items-center gap-1">
                    <Save className="w-3 h-3" /> {editingItem ? 'Update' : 'Create'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="btn-secondary text-sm flex items-center gap-1">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-2">
            {projects.length === 0 && !showForm && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No projects yet. Create one to organize your time.</div>
            )}
            {projects.map(project => (
              <div key={project.id} className="card p-4 flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#3b82f6' }}></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {project.client_name && <span>Client: {project.client_name}</span>}
                  </div>
                </div>
                <button onClick={() => handleEditProject(project)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteProject(project.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {tab === 'clients' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Clients</h2>
            <button
              onClick={() => { setShowClientForm(true); setEditingClient(null); setClientForm({ name: '' }); }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> New Client
            </button>
          </div>

          {showClientForm && (
            <div className="card p-4 mb-4">
              <form onSubmit={handleSaveClient} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Name *</label>
                  <input
                    type="text"
                    value={clientForm.name}
                    onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn-primary text-sm">{editingClient ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => { setShowClientForm(false); setEditingClient(null); }} className="btn-secondary text-sm">Cancel</button>
              </form>
            </div>
          )}

          <div className="space-y-2">
            {clients.length === 0 && !showClientForm && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No clients yet.</div>
            )}
            {clients.map(client => (
              <div key={client.id} className="card p-4 flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-400" />
                <p className="flex-1 font-medium text-gray-900 dark:text-white">{client.name}</p>
                <button onClick={() => handleEditClient(client)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteClient(client.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags Tab */}
      {tab === 'tags' && <TagsManager />}
    </div>
  );
}
