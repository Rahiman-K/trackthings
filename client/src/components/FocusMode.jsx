import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Square, CheckCircle2, Timer } from 'lucide-react';
import { startTimer, pauseTimer, resumeTimer, stopTimer, updateTask, updateChecklistItem, getTask } from '../api';
import { useNotification } from '../hooks/useNotification';

export default function FocusMode({ task: initialTask, onClose }) {
  const [task, setTask] = useState(initialTask);
  const [session, setSession] = useState(
    initialTask.sessions?.find(s => s.status === 'running' || s.status === 'paused') || null
  );
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [notified, setNotified] = useState(false);
  const intervalRef = useRef(null);
  const { notify } = useNotification();

  // Calculate initial elapsed time
  useEffect(() => {
    if (session) {
      let totalElapsed = session.total_elapsed || 0;
      if (session.status === 'running') {
        const startTime = new Date(session.resumed_at || session.started_at).getTime();
        totalElapsed += Math.floor((Date.now() - startTime) / 1000);
        setIsRunning(true);
      }
      setElapsed(totalElapsed);
    }
  }, []);

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  // Notification when planned time is reached
  useEffect(() => {
    if (!notified && task.planned_duration > 0 && elapsed >= task.planned_duration && isRunning) {
      notify('⏱️ Time is up!', `You've spent ${formatDuration(task.planned_duration)} on "${task.title}". Great work!`);
      setNotified(true);
      // Also play a sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgkKmvnGRGQmSIoq2dZUxHX4Oenp1oVUlYgpSXmZdkTkRdgI+Tk5RUST1ffoqNj41MS0Bxe4WJiIdCPkd6fIKEg3s8RnN6f4KBfnhAUXl/gn99d3g8TXV8fn18d3RAWHl+fX13dHU8T3V7fX15dnVFXHp/fn55dnVBUnd9fn16d3REW3l+fn56eHVBUnh9fn17eHVFW3l+fn57eHZCU3h+fn57eHZEW3p+fn57eHZDVHl+fn57eHZDWnl+fn57eHZDVHh+fn57eXZEW3l+fn57eHZDVHl+fn57eHZEW3l+fn57eHZDVHl+fn57eHZEWnl+fn57eHZDVHl+fn57eHZDWnl+fn57eHZDVHl+fn57eHZEW3l+');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}
    }
  }, [elapsed, notified, task.planned_duration, isRunning]);

  const refreshTask = async () => {
    try {
      const updated = await getTask(task.id);
      setTask(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStart = async () => {
    try {
      const newSession = await startTimer(task.id);
      setSession(newSession);
      setIsRunning(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePause = async () => {
    if (!session) return;
    try {
      const updated = await pauseTimer(session.id);
      setSession(updated);
      setIsRunning(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResume = async () => {
    if (!session) return;
    try {
      const updated = await resumeTimer(session.id);
      setSession(updated);
      setIsRunning(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStop = async () => {
    if (!session) return;
    try {
      await stopTimer(session.id);
      setSession(null);
      setIsRunning(false);
      refreshTask();
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async () => {
    try {
      if (session) await stopTimer(session.id);
      await updateTask(task.id, { status: 'completed' });
      notify('✅ Task Complete!', `"${task.title}" marked as done.`);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleChecklistToggle = async (item) => {
    try {
      await updateChecklistItem(item.id, { is_completed: item.is_completed ? 0 : 1 });
      refreshTask();
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const progressPercent = task.planned_duration > 0
    ? Math.min(100, Math.round((elapsed / task.planned_duration) * 100))
    : 0;

  const isOvertime = task.planned_duration > 0 && elapsed > task.planned_duration;

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Focus content */}
      <div className="text-center max-w-lg w-full">
        {/* Task title */}
        <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
        {task.description && (
          <p className="text-gray-400 mb-8">{task.description}</p>
        )}

        {/* Timer display */}
        <div className="mb-8">
          <div className={`text-7xl font-mono font-bold tracking-wider ${isOvertime ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {formatTime(elapsed)}
          </div>
          {task.planned_duration > 0 && (
            <div className="mt-3 text-gray-400 flex items-center justify-center gap-2">
              <Timer className="w-4 h-4" />
              <span>
                {formatDuration(elapsed)} / {formatDuration(task.planned_duration)} planned
                {isOvertime && <span className="text-red-400 ml-2">(overtime!)</span>}
              </span>
            </div>
          )}
        </div>

        {/* Progress ring */}
        {task.planned_duration > 0 && (
          <div className="mb-8">
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${isOvertime ? 'bg-red-500' : 'bg-primary-500'}`}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{progressPercent}% of planned time</p>
          </div>
        )}

        {/* Timer controls */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {!session && !isRunning && (
            <button onClick={handleStart} className="p-4 bg-green-600 hover:bg-green-700 rounded-full transition-colors shadow-lg shadow-green-600/30">
              <Play className="w-8 h-8" />
            </button>
          )}
          {isRunning && (
            <button onClick={handlePause} className="p-4 bg-amber-600 hover:bg-amber-700 rounded-full transition-colors shadow-lg shadow-amber-600/30">
              <Pause className="w-8 h-8" />
            </button>
          )}
          {session && !isRunning && (
            <button onClick={handleResume} className="p-4 bg-green-600 hover:bg-green-700 rounded-full transition-colors shadow-lg shadow-green-600/30">
              <Play className="w-8 h-8" />
            </button>
          )}
          {session && (
            <button onClick={handleStop} className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors shadow-lg shadow-red-600/30">
              <Square className="w-8 h-8" />
            </button>
          )}
        </div>

        {/* Checklist in focus mode */}
        {task.checklist && task.checklist.length > 0 && (
          <div className="bg-white/10 rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">Checklist</h3>
            <div className="space-y-2">
              {task.checklist.map(item => (
                <label key={item.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-lg">
                  <input
                    type="checkbox"
                    checked={!!item.is_completed}
                    onChange={() => handleChecklistToggle(item)}
                    className="rounded border-gray-500 text-primary-500 focus:ring-primary-500 bg-transparent w-5 h-5"
                  />
                  <span className={`text-sm ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                    {item.title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Complete button */}
        <button
          onClick={handleComplete}
          className="flex items-center gap-2 mx-auto px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-medium transition-colors shadow-lg shadow-green-600/20"
        >
          <CheckCircle2 className="w-5 h-5" />
          Mark Complete
        </button>
      </div>
    </div>
  );
}
