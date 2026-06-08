import React, { useState, useEffect } from 'react';
import { Calendar, Link2, Unlink, User, LogOut } from 'lucide-react';
import { getGoogleAuthUrl, getGoogleStatus, disconnectGoogle, updateProfile, setToken } from '../api';

export default function Settings({ user, onLogout }) {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadGoogleStatus();
    // Check if returning from Google OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      setGoogleConnected(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadGoogleStatus = async () => {
    try {
      const { connected } = await getGoogleStatus();
      setGoogleConnected(connected);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectGoogle = async () => {
    setLoading(true);
    try {
      const { url } = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Disconnect Google Calendar?')) return;
    try {
      await disconnectGoogle();
      setGoogleConnected(false);
    } catch (err) {
      alert(err.message);
    }
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
          Google Calendar
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Connect your Google Calendar to sync tasks as calendar events. Your scheduled tasks will appear in Google Calendar with the planned duration.
        </p>
        {googleConnected ? (
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Google Calendar connected</span>
            </div>
            <button onClick={handleDisconnectGoogle} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700">
              <Unlink className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectGoogle}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-sm text-gray-700 dark:text-gray-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Connecting...' : 'Connect Google Calendar'}
          </button>
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
