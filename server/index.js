const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const taskRoutes = require('./routes/tasks');
const timerRoutes = require('./routes/timer');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/history', historyRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`TimeBox server running on http://localhost:${PORT}`);
});
