import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Pause, DollarSign } from 'lucide-react';
import { quickStartTimer, stopTimer, pauseTimer, resumeTimer, getActiveSession, getProjects } from '../api';

export default function TimerBar({ onSessionChange }) {
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [isBillable, setIsBillable] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [projects, setProjects] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadActiveSession();
    loadProjects();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (activeSession && activeSession.status === 'running') {
      const startTime = new Date(activeSession.resumed_at || activeSession.started_at).getTime();
      const base = activeSession.total_elapsed || 0;
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        setElapsed(base + Math.floor((now - startTime) / 1000));
      }, 1000);
    } else if (activeSession && activeSession.status === 'paused') {
      setElapsed(activeSession.total_elapsed || 0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeSession]);

  const loadActiveSession = async () => {
    try {
      const session = await getActiveSession();
      setActiveSession(session);
      if (session) {
        setDescription(session.description || '');
        setProjectId(session.project_id || '');
        setIsBillable(!!session.is_billable);
      }
    } catch (e) { /* ignore */ }
  };

  const loadProjects = async () => {
    try {
      const p = await getProjects();
      setProjects(p);
    } catch (e) { /* ignore */ }
  };

  const handleStart = async () => {
    try {
      const session = await quickStartTimer({
        description: description.trim(),
        project_id: projectId || null,
        is_billable: isBillable,
      });
      setActiveSession(session);
      onSessionChange?.();
    } catch (e) { console.error(e); }
  };

  const handleStop = async () => {
    if (!activeSession) return;
    try {
      await stopTimer(activeSession.id);
      setActiveSession(null);
      setDescription('');
      setProjectId('');
      setIsBillable(false);
      setElapsed(0);
      onSessionChange?.();
    } catch (e) { console.error(e); }
  };

  const handlePause = async () => {
    if (!activeSession) return;
    try {
      const updated = await pauseTimer(activeSession.id);
      setActiveSession(updated);
    } catch (e) { console.error(e); }
  };

  const handleResume = async () => {
    if (!activeSession) return;
    try {
      const updated = await resumeTimer(activeSession.id);
      setActiveSession(updated);
    } catch (e) { console.error(e); }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isRunning = activeSession?.status === 'running';
  const isPaused = activeSession?.status === 'paused';

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !activeSession) handleStart(); }}
          placeholder="What are you working on?"
          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          disabled={!!activeSession}
        />

        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white w-36"
          disabled={!!activeSession}
        >
          <option value="">No Project</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <button
          onClick={() => setIsBillable(!isBillable)}
          disabled={!!activeSession}
          className={`p-2 rounded-lg transition-colors ${isBillable ? 'bg-green-100 dark:bg-green-900 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}
          title={isBillable ? 'Billable' : 'Non-billable'}
        >
          <DollarSign className="w-4 h-4" />
        </button>

        <div className="text-lg font-mono font-semibold text-gray-900 dark:text-white min-w-[80px] text-right">
          {formatTime(elapsed)}
        </div>

        {!activeSession && (
          <button onClick={handleStart} className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
            <Play className="w-5 h-5" />
          </button>
        )}

        {isRunning && (
          <>
            <button onClick={handlePause} className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">
              <Pause className="w-5 h-5" />
            </button>
            <button onClick={handleStop} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
              <Square className="w-5 h-5" />
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button onClick={handleResume} className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
              <Play className="w-5 h-5" />
            </button>
            <button onClick={handleStop} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
              <Square className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
