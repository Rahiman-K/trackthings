import React, { useState, useEffect } from 'react';
import { BarChart3, List, Grid3X3, Clock, Filter } from 'lucide-react';
import { getSummaryReport, getDetailedReport, getWeeklyReport, getProjects, getClients, getTags } from '../api';

export default function ReportsView() {
  const [tab, setTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [tags, setTags] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [projectFilter, setProjectFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [billableFilter, setBillableFilter] = useState('');

  // Data
  const [summaryData, setSummaryData] = useState(null);
  const [detailedData, setDetailedData] = useState([]);
  const [weeklyData, setWeeklyData] = useState(null);

  useEffect(() => {
    Promise.all([getProjects(), getClients(), getTags()])
      .then(([p, c, t]) => { setProjects(p); setClients(c); setTags(t); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadReport(); }, [tab, startDate, endDate, projectFilter, clientFilter, tagFilter, billableFilter]);

  const buildParams = () => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (projectFilter) params.project_id = projectFilter;
    if (clientFilter) params.client_id = clientFilter;
    if (tagFilter) params.tag_id = tagFilter;
    if (billableFilter) params.billable = billableFilter;
    return params;
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = buildParams();
      if (tab === 'summary') {
        const data = await getSummaryReport(params);
        setSummaryData(data);
      } else if (tab === 'detailed') {
        const data = await getDetailedReport(params);
        setDetailedData(data);
      } else if (tab === 'weekly') {
        // Get Monday of current week
        const d = new Date(startDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        const data = await getWeeklyReport({ start_date: d.toISOString().split('T')[0] });
        setWeeklyData(data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatHours = (seconds) => {
    if (!seconds) return '0.0';
    return (seconds / 3600).toFixed(1);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Report Type Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'summary', label: 'Summary', icon: BarChart3 },
          { id: 'detailed', label: 'Detailed', icon: List },
          { id: 'weekly', label: 'Weekly', icon: Grid3X3 },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          <span className="text-gray-400">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">All Tags</option>
            {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={billableFilter} onChange={e => setBillableFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" style={{display:'none'}}>
            <option value="">All Entries</option>
            <option value="1">Billable</option>
            <option value="0">Non-billable</option>
          </select>
        </div>
      </div>

      {loading && <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading report...</div>}

      {/* Summary Report */}
      {!loading && tab === 'summary' && summaryData && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <Clock className="w-4 h-4" /> Total Time
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(summaryData.total_seconds)}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <Clock className="w-4 h-4" /> Total Entries
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryData.entry_count}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                <List className="w-4 h-4" /> Entries
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryData.entry_count}</p>
            </div>
          </div>

          {/* By Project */}
          <div className="card p-4 mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">By Project</h3>
            {summaryData.by_project.length === 0 && <p className="text-sm text-gray-500">No data</p>}
            <div className="space-y-3">
              {summaryData.by_project.map((item, i) => {
                const pct = summaryData.total_seconds ? (item.total_seconds / summaryData.total_seconds * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.project_color }}></div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{item.project_name}</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{formatDuration(item.total_seconds)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: item.project_color }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Client */}
          <div className="card p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">By Client</h3>
            {summaryData.by_client.length === 0 && <p className="text-sm text-gray-500">No data</p>}
            <div className="space-y-2">
              {summaryData.by_client.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-900 dark:text-white">{item.client_name}</span>
                  <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{formatDuration(item.total_seconds)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Report */}
      {!loading && tab === 'detailed' && (
        <div className="card p-0 overflow-hidden">
          {detailedData.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No entries found for the selected filters.</div>
          )}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {detailedData.map(entry => (
              <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {entry.description || entry.task_title || 'No description'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.project_name && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: (entry.project_color || '#3b82f6') + '20', color: entry.project_color || '#3b82f6' }}>
                        {entry.project_name}
                      </span>
                    )}
                    {entry.client_name && <span className="text-xs text-gray-500">{entry.client_name}</span>}
                    {(entry.tags || []).map(tag => (
                      <span key={tag.id} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">{tag.name}</span>
                    ))}
                    {entry.is_billable ? null : null}
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(entry.started_at).toLocaleDateString()}
                </div>
                <div className="font-mono text-sm font-medium text-gray-900 dark:text-white min-w-[72px] text-right">
                  {formatDuration(entry.total_elapsed)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Report */}
      {!loading && tab === 'weekly' && weeklyData && (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Project</th>
                {weeklyData.days.map(day => (
                  <th key={day} className="text-center py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
                    {new Date(day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
                    <div className="text-xs font-normal text-gray-400">{day.slice(5)}</div>
                  </th>
                ))}
                <th className="text-right py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Total</th>
              </tr>
            </thead>
            <tbody>
              {weeklyData.projects.map((project, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.project_color }}></div>
                      <span className="text-gray-900 dark:text-white">{project.project_name}</span>
                    </div>
                  </td>
                  {weeklyData.days.map(day => (
                    <td key={day} className="text-center py-2 px-2 font-mono text-gray-600 dark:text-gray-400">
                      {project.days[day] > 0 ? formatHours(project.days[day]) + 'h' : '-'}
                    </td>
                  ))}
                  <td className="text-right py-2 px-2 font-mono font-medium text-gray-900 dark:text-white">
                    {formatHours(project.total)}h
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                <td className="py-2 px-2 font-medium text-gray-900 dark:text-white">Total</td>
                {weeklyData.days.map(day => (
                  <td key={day} className="text-center py-2 px-2 font-mono font-medium text-gray-900 dark:text-white">
                    {formatHours(weeklyData.daily_totals[day])}h
                  </td>
                ))}
                <td className="text-right py-2 px-2 font-mono font-bold text-primary-600">
                  {formatHours(weeklyData.total)}h
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
