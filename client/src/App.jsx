import React, { useState, useEffect } from 'react';
import { Calendar, Clock, History, Plus, Sun, Moon, Settings as SettingsIcon } from 'lucide-react';
import DayView from './components/DayView';
import TaskModal from './components/TaskModal';
import HistoryView from './components/HistoryView';
import FocusMode from './components/FocusMode';
import AuthScreen from './components/AuthScreen';
import Settings from './components/Settings';
import { useTheme } from './hooks/useTheme';
import { isLoggedIn, getProfile, setToken } from './api';

const TABS = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const [authenticated, setAuthenticated] = useState(isLoggedIn());
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [focusTask, setFocusTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dark, setDark] = useTheme();

  useEffect(() => {
    if (authenticated) {
      getProfile().then(setUser).catch(() => {
        setToken(null);
        setAuthenticated(false);
      });
    }
  }, [authenticated]);

  const refresh = () => setRefreshKey(k => k + 1);

  const handleAuth = (userData) => {
    setAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setUser(null);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleFocus = (task) => {
    setFocusTask(task);
  };

  const handleCloseFocus = () => {
    setFocusTask(null);
    refresh();
  };

  // Show auth screen if not logged in
  if (!authenticated) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  if (focusTask) {
    return <FocusMode task={focusTask} onClose={handleCloseFocus} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">TrackThings</h1>
          {user?.name && (
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
              • {user.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {activeTab !== 'settings' && (
            <button
              onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Task</span>
            </button>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        {activeTab === 'today' && (
          <DayView
            key={refreshKey}
            date={new Date().toISOString().split('T')[0]}
            onEditTask={handleEditTask}
            onFocusTask={handleFocus}
            onRefresh={refresh}
          />
        )}
        {activeTab === 'calendar' && (
          <DayView
            key={`${refreshKey}-${selectedDate}`}
            date={selectedDate}
            onDateChange={setSelectedDate}
            showDatePicker
            onEditTask={handleEditTask}
            onFocusTask={handleFocus}
            onRefresh={refresh}
          />
        )}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'settings' && <Settings user={user} onLogout={handleLogout} />}
      </main>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={editingTask}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSaved={() => { setShowTaskModal(false); setEditingTask(null); refresh(); }}
          defaultDate={activeTab === 'calendar' ? selectedDate : new Date().toISOString().split('T')[0]}
        />
      )}
    </div>
  );
}
