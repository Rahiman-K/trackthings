import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { getStats, getHistoryTasks } from '../api';

export default function HistoryView() {
  const [range, setRange] = useState('week');
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const getDateRange = () => {
    const end = new Date().toISOString().split('T')[0];
    let start;
    if (range === 'week') {
      start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    } else if (range === 'month') {
      start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    } else {
      start = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    }
    return { start, end };
  };

  const loadData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    try {
      const [statsData, tasksData] = await Promise.all([
        getStats(start, end),
        getHistoryTasks(start, end)
      ]);
      setStats(statsData);
      setTasks(tasksData);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [range]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading history...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">History & Analytics</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['week', 'month', '3months'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === r ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {r === 'week' ? '7 Days' : r === 'month' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.completed_tasks}</p>
                <p className="text-sm text-gray-500">Tasks Completed</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.total_time_tracked)}</p>
                <p className="text-sm text-gray-500">Time Tracked</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.completed_tasks > 0 ? formatDuration(Math.round(stats.total_time_tracked / stats.completed_tasks)) : '0m'}
                </p>
                <p className="text-sm text-gray-500">Avg per Task</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Breakdown */}
      {stats?.daily_breakdown && stats.daily_breakdown.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            Daily Breakdown
          </h3>
          <div className="space-y-3">
            {stats.daily_breakdown.map(day => (
              <div key={day.date} className="flex items-center gap-4">
                <span className="text-sm text-gray-500 w-24">{formatDate(day.date)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${day.total_tasks > 0 ? (day.completed / day.total_tasks) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">
                      {day.completed}/{day.total_tasks}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-gray-600 w-16 text-right">
                  {formatDuration(day.time_tracked)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task History List */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Completed Tasks</h3>
        {tasks.filter(t => t.status === 'completed').length === 0 ? (
          <p className="text-gray-500 text-sm">No completed tasks in this period</p>
        ) : (
          <div className="space-y-3">
            {tasks
              .filter(t => t.status === 'completed')
              .map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(task.scheduled_date)} • {task.session_count} session(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary-600">
                      {formatDuration(task.total_tracked)} tracked
                    </p>
                    {task.planned_duration > 0 && (
                      <p className="text-xs text-gray-400">
                        of {formatDuration(task.planned_duration)} planned
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
