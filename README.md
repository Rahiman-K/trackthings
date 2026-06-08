# TrackThings ⏱️

A free, all-in-one time-boxed task execution tracker. Plan your day, track time spent on tasks, and review your productivity history.

## Features

- **Task Management** — Create tasks with planned duration, optional scheduled time, priority, and checklists
- **Live Timer** — Start/Pause/Resume/Stop timer for each task with notifications
- **Focus Mode** — Full-screen distraction-free mode with live timer and checklist
- **Task Rollover** — Incomplete tasks automatically carry over to the next day
- **Calendar View** — Navigate between dates, see scheduled and unscheduled tasks
- **History & Analytics** — Track completed tasks, time logged, daily breakdowns
- **Dark Mode** — Toggle between light and dark themes
- **Data Export/Import** — Back up and restore your data as JSON
- **PWA Support** — Install as an app on any device from browser
- **Mobile Apps** — Android APK via Capacitor (auto-built by GitHub Actions)

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Mobile**: Capacitor (Android/iOS)
- **Icons**: Lucide React
- **CI/CD**: GitHub Actions

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
# Run both server and client
npm run dev
```

- Server runs on http://localhost:3001
- Client runs on http://localhost:5173

### Production Build

```bash
npm run build
npm start
```

## Mobile App (Android)

The APK is auto-built by GitHub Actions on every push to `main`.

### Download APK
1. Go to your repo → Actions tab → "Build Android APK"
2. Download the `trackthings-apk` artifact
3. Install on your Android phone (enable "Install from unknown sources")

### Create a release
```bash
git tag v1.0.0
git push origin v1.0.0
```
This creates a GitHub Release with the APK attached.

## Deployment (Free)

### Render.com
1. Connect your GitHub repo at render.com
2. It auto-detects `render.yaml` and deploys
3. You get a free URL like `trackthings-xxxx.onrender.com`

## Project Structure

```
├── .github/workflows/
│   ├── build-apk.yml     # Auto-build Android APK
│   └── deploy.yml        # CI verification
├── server/
│   ├── index.js          # Express server entry
│   ├── db.js             # SQLite database setup
│   └── routes/
│       ├── tasks.js      # Task CRUD + checklist
│       ├── timer.js      # Timer start/pause/resume/stop
│       ├── history.js    # Analytics and daily reviews
│       └── export.js     # Data export/import
├── client/
│   ├── capacitor.config.json  # Mobile app config
│   ├── src/
│   │   ├── App.jsx       # Main app with navigation
│   │   ├── api.js        # API client
│   │   ├── hooks/
│   │   │   ├── useTheme.js         # Dark mode
│   │   │   └── useNotification.js  # Browser notifications
│   │   └── components/
│   │       ├── DayView.jsx     # Daily task list
│   │       ├── TaskCard.jsx    # Task with timer controls
│   │       ├── TaskModal.jsx   # Create/edit task
│   │       ├── FocusMode.jsx   # Full-screen focus timer
│   │       └── HistoryView.jsx # Analytics + export
│   └── ...
├── data/                 # SQLite database (auto-created)
├── Dockerfile            # Container deployment
└── render.yaml           # Render.com config
```
