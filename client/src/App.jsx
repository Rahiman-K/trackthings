import React, { useState } from 'react';
import { Calendar, Clock, History, BarChart3, Plus, Sun } from 'lucide-react';
import DayView from './components/DayView';
import TaskModal from './components/TaskModal';
import HistoryView from './components/HistoryView';
import FocusMode from './components/FocusMode';

const TABS = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'history', label: 'History', icon: History },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [focusTask, setFocusTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

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

  if (focusTask) {
    return <FocusMode task={focusTask} onClose={handleCloseFocus} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">TimeBox</h1>
        </div>
        <button
          onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 px-6">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
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
