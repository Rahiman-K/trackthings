# TimeBox ⏱️

A free, all-in-one time-boxed task execution tracker. Plan your day, track time spent on tasks, and review your productivity history.

## Features

- **Task Management** — Create tasks with planned duration, optional scheduled time, priority, and checklists
- **Live Timer** — Start/Pause/Resume/Stop timer for each task
- **Focus Mode** — Full-screen distraction-free mode with live timer and checklist
- **Task Rollover** — Incomplete tasks automatically carry over to the next day
- **Calendar View** — Navigate between dates, see scheduled and unscheduled tasks
- **History & Analytics** — Track completed tasks, time logged, daily breakdowns
- **Daily Planning** — See your day at a glance with progress indicators

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install root dependencies (server)
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### Development

```bash
# Run both server and client (from root)
npm run dev
```

- Server runs on http://localhost:3001
- Client runs on http://localhost:5173

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
├── server/
│   ├── index.js          # Express server entry
│   ├── db.js             # SQLite database setup
│   └── routes/
│       ├── tasks.js      # Task CRUD + checklist operations
│       ├── timer.js      # Timer start/pause/resume/stop
│       └── history.js    # Analytics and daily reviews
├── client/
│   ├── src/
│   │   ├── App.jsx       # Main app with navigation
│   │   ├── api.js        # API client
│   │   └── components/
│   │       ├── DayView.jsx     # Daily task list view
│   │       ├── TaskCard.jsx    # Individual task with controls
│   │       ├── TaskModal.jsx   # Create/edit task form
│   │       ├── FocusMode.jsx   # Full-screen focus timer
│   │       └── HistoryView.jsx # Analytics dashboard
│   └── ...
└── data/                 # SQLite database stored here
```
