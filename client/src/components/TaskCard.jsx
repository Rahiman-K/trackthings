import React, { useState } from 'react';
import {
  Play, Pause, Square, CheckCircle2, Circle, Clock, Timer,
  Edit2, Trash2, Focus, RotateCcw, ChevronDown, ChevronRight
} from 'lucide-react';
import { updateTask, deleteTask, startTimer, pauseTimer, resumeTimer, stopTimer, updateChecklistItem } from '../api';

export default function TaskCard({ task, onEdit, onFocus, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [activeSession, setActiveSession] = useState(
    task.sessions?.find(s => s.status === 'running' || s.status === 'paused') || null
  );

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const handleStart = async () => {
    try {
      const session = await startTimer(task.id);
      setActiveSession(session);
      onRefresh();
    } catch (err) {
      console.error('Failed to start timer:', err);
    }
  };

  const handlePause = async () => {
    if (!activeSession) return;
    try {
      const session = await pauseTimer(activeSession.id);
      setActiveSession(session);
      onRefresh();
    } catch (err) {
      console.error('Failed to pause timer:', err);
    }
  };

  const handleResume = async () => {
    if (!activeSession) return;
    try {
      const session = await resumeTimer(activeSession.id);
      setActiveSession(session);
      onRefresh();
    } catch (err) {
      console.error('Failed to resume timer:', err);
    }
  };

  const handleStop = async () => {
    if (!activeSession) return;
    try {
      await stopTimer(activeSession.id);
      setActiveSession(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to stop timer:', err);
    }
  };

  const handleComplete = async () => {
    try {
      await updateTask(task.id, { status: 'completed' });
      if (activeSession) {
        await stopTimer(activeSession.id);
        setActiveSession(null);
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(task.id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleChecklistToggle = async (item) => {
    try {
      await updateChecklistItem(item.id, { is_completed: item.is_completed ? 0 : 1 });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle checklist:', err);
    }
  };

  const isCompleted = task.status === 'completed';
  const isRunning = activeSession?.status === 'running';
  const isPaused = activeSession?.status === 'paused';
  const progressPercent = task.planned_duration > 0
    ? Math.min(100, Math.round((task.total_tracked / task.planned_duration) * 100))
    : 0;

  const priorityColors = {
    high: 'border-l-red-500',
    medium: 'border-l-amber-400',
    low: 'border-l-green-500',
  };

  return (
    <div className={`card border-l-4 ${priorityColors[task.priority] || 'border-l-gray-300'} ${isCompleted ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Complete checkbox */}
        <button onClick={handleComplete} className="mt-1 flex-shrink-0">
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300 hover:text-green-500 transition-colors" />
          )}
        </button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-medium text-gray-900 dark:text-white ${isCompleted ? 'line-through' : ''}`}>
              {task.title}
            </h4>
            {task.rolled_over_from && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Carried over
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
            {task.scheduled_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(task.scheduled_time)}
              </span>
            )}
            {task.planned_duration > 0 && (
              <span className="flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                {formatDuration(task.planned_duration)} planned
              </span>
            )}
            {task.total_tracked > 0 && (
              <span className="text-primary-600 font-medium">
                {formatDuration(task.total_tracked)} tracked
              </span>
            )}
          </div>

          {/* Progress bar */}
          {task.planned_duration > 0 && (
            <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${progressPercent >= 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Expanded checklist */}
          {expanded && task.checklist && task.checklist.length > 0 && (
            <div className="mt-3 space-y-2">
              {task.checklist.map(item => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!item.is_completed}
                    onChange={() => handleChecklistToggle(item)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className={`text-sm ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.title}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isCompleted && (
            <>
              {/* Timer controls */}
              {!activeSession && (
                <button onClick={handleStart} className="p-2 hover:bg-green-50 rounded-lg text-green-600" title="Start timer">
                  <Play className="w-4 h-4" />
                </button>
              )}
              {isRunning && (
                <button onClick={handlePause} className="p-2 hover:bg-amber-50 rounded-lg text-amber-600" title="Pause timer">
                  <Pause className="w-4 h-4" />
                </button>
              )}
              {isPaused && (
                <button onClick={handleResume} className="p-2 hover:bg-green-50 rounded-lg text-green-600" title="Resume timer">
                  <Play className="w-4 h-4" />
                </button>
              )}
              {activeSession && (
                <button onClick={handleStop} className="p-2 hover:bg-red-50 rounded-lg text-red-600" title="Stop timer">
                  <Square className="w-4 h-4" />
                </button>
              )}

              {/* Focus mode */}
              <button onClick={onFocus} className="p-2 hover:bg-primary-50 rounded-lg text-primary-600" title="Focus mode">
                <Focus className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Expand toggle */}
          {task.checklist && task.checklist.length > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}

          {/* Edit/Delete */}
          <button onClick={onEdit} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={handleDelete} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
