import React, { useState, useEffect } from 'react';
import { Calendar, User, LogOut, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { updateProfile, setToken } from '../api';

const API_BASE = '/api';

export default function Settings({ user, onLogout }) {
  const [feedUrl, setFeedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadFeedUrl();
  }, []);

  const loadFeedUrl = async () => {
    try {
      const token = localStorage.getItem('trackthings-token');
      const res = await fetch(`${API_BASE}/google/feed-url`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setFeedUrl(data.url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    setToken(null);
    onLogout();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>

      {/* Profile */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          Profile
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button onClick={handleSaveProfile} className="btn-primary text-sm">
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          Google Calendar Sync
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Add your tasks to Google Calendar by subscribing to this URL. Your tasks will automatically appear as events.
        </p>

        {feedUrl && (
          <div className="space-y-4">
            {/* Feed URL */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={feedUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-mono"
              />
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 text-sm mb-2">How to add to Google Calendar:</h4>
              <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1.5 list-decimal list-inside">
                <li>Copy the URL above</li>
                <li>Open <a href="https://calendar.google.com" target="_blank" rel="noopener" className="underline">Google Calendar</a></li>
                <li>Click <strong>+</strong> next to "Other calendars" (left sidebar)</li>
                <li>Select <strong>"From URL"</strong></li>
                <li>Paste the URL → Click <strong>"Add calendar"</strong></li>
              </ol>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                Google refreshes subscribed calendars every few hours. New tasks will appear automatically.
              </p>
            </div>

            {/* Direct link to add */}
            <a
              href={`https://calendar.google.com/calendar/r/settings/addbyurl`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Open Google Calendar Settings
            </a>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="card">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
