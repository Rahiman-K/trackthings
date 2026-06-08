import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react';
import TaskCard from './TaskCard';
import { getTasks, rolloverTasks } from '../api';

export default function DayView({ date, onDateChange, showDatePicker, onEditTask, onFocusTask, onRefresh }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rolledOver, setRolledOver] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks(date);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, [date]);

  const handleRollover = async () => {
    try {
      await rolloverTasks();
      setRolledOver(true);
      loadTasks();
    } catch (err) {
      console.error('Rollover failed:', err);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const isToday = date === today;

  const scheduledTasks = tasks.filter(t => t.scheduled_time);
  const unscheduledTasks = tasks.filter(t => !t.scheduled_time);
  const rolledOverTasks = tasks.filter(t => t.rolled_over_from);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalPlanned = tasks.reduce((sum, t) => sum + (t.planned_duration || 0), 0);
  const totalTracked = tasks.reduce((sum, t) => sum + (t.total_tracked || 0), 0);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const navigateDate = (direction) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + direction);
    onDateChange(d.toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Date Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {showDatePicker && (
            <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isToday ? "Today's Plan" : formatDate(date)}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {completedCount}/{tasks.length} tasks done • {formatDuration(totalPlanned)} planned • {formatDuration(totalTracked)} tracked
            </p>
          </div>
          {showDatePicker && (
            <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
        </div>
        {showDatePicker && (
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
          />
        )}
      </div>

      {/* Rollover Banner */}
      {isToday && rolledOverTasks.length > 0 && !rolledOver && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-amber-800">
              {rolledOverTasks.length} task(s) carried over from previous days
            </span>
          </div>
        </div>
      )}

      {/* Rollover Button for today */}
      {isToday && !rolledOver && (
        <button
          onClick={handleRollover}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Check for incomplete tasks from previous days
        </button>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No tasks for this day</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Create a new task to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Scheduled Tasks */}
          {scheduledTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Scheduled
              </h3>
              <div className="space-y-3">
                {scheduledTasks
                  .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''))
                  .map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={() => onEditTask(task)}
                      onFocus={() => onFocusTask(task)}
                      onRefresh={onRefresh}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Unscheduled Tasks */}
          {unscheduledTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {scheduledTasks.length > 0 ? 'Unscheduled' : 'Tasks'}
              </h3>
              <div className="space-y-3">
                {unscheduledTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => onEditTask(task)}
                    onFocus={() => onFocusTask(task)}
                    onRefresh={onRefresh}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
