const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const timerRoutes = require('./routes/timer');
const historyRoutes = require('./routes/history');
const exportRoutes = require('./routes/export');
const googleRoutes = require('./routes/google');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/google', googleRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TrackThings server running on http://localhost:${PORT}`);
});
