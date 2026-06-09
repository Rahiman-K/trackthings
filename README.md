# TrackThings ⏱️

A free, all-in-one time tracking and task management app. Plan your day, track time on tasks and projects, view reports, and sync with Google Calendar.

## Features

### Task Management
- Create tasks with title, description, planned duration, scheduled time/date, priority
- Assign tasks to projects
- Checklist subtasks within each task
- Task rollover — incomplete tasks automatically carry over to the next day
- Mark tasks complete with one click

### Time Tracking
- **Global Timer Bar** — "What are you working on?" quick start (like Toggl)
- Start/Pause/Resume/Stop timer per task
- **Manual Time Entry** — add time after the fact
- Inline edit time entries (change description, project, start/end time)
- Duplicate and delete entries
- Time entries grouped by day with daily totals

### Focus Mode
- Full-screen distraction-free timer
- Live progress bar (planned vs actual)
- Overtime indicator with notification when time is up
- Checklist visible during focus

### Projects & Clients
- Create projects with custom colors and client association
- Create and manage clients
- Assign tasks and time entries to projects
- Filter reports by project/client

### Tags
- Create and manage tags
- Tag time entries for categorization
- Filter reports by tags

### Reports (3 Types)
- **Summary** — total time grouped by project/client with progress bars
- **Detailed** — full list of time entries with filters
- **Weekly** — grid showing hours per day per project
- All reports filterable by date range, project, client, and tag

### Calendar & Scheduling
- Day view with scheduled and unscheduled tasks
- Calendar navigation with date picker
- Google Calendar sync via ICS feed (one-time URL subscription)

### History & Analytics
- Tasks completed, total time tracked, daily breakdowns
- Average time per task
- 7-day / 30-day / 90-day views

### Account & Sync
- User authentication (register/login/forgot password)
- Same account works across web and mobile — data syncs automatically
- Data export (JSON) and import

### UI
- Dark mode (auto-detects system preference)
- Desktop-first responsive design
- PWA support (install from browser)

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: libSQL/Turso (cloud SQLite — persists across deploys)
- **Mobile**: Capacitor (Android APK auto-built via GitHub Actions)
- **Icons**: Lucide React
- **Auth**: JWT (30-day tokens)
- **CI/CD**: GitHub Actions (APK build + deploy verification)

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### Development

```bash
npm run dev
```

- Server: http://localhost:3001
- Client: http://localhost:5173

### Production Build

```bash
npm run build
npm start
```

## Deployment

### Web (Render.com — free)
1. Push to GitHub
2. Connect repo on render.com
3. Set environment variables:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (random string)
   - `FRONTEND_URL` = your Render URL
   - `TURSO_DATABASE_URL` = your Turso DB URL
   - `TURSO_AUTH_TOKEN` = your Turso token
4. Auto-deploys on every push to `main`

### Database (Turso — free)
1. Sign up at turso.tech (use GitHub)
2. Create database named `trackthings`
3. Get the database URL and auth token
4. Add to Render environment variables

### Android APK (GitHub Actions — free)
1. Push to `main` → APK auto-builds
2. Go to Actions tab → download `trackthings-apk` artifact
3. Install on your phone (enable "Unknown sources")

For releases:
```bash
git tag v1.0.0
git push origin v1.0.0
```
Creates a GitHub Release with APK attached.

### Google Calendar Sync
1. Open app → Settings tab
2. Copy the Calendar Feed URL
3. In Google Calendar: Other calendars → From URL → paste → Add
4. Tasks appear as events automatically

## Project Structure

```
├── .github/workflows/
│   ├── build-apk.yml         # Auto-build Android APK
│   └── deploy.yml            # CI verification
├── server/
│   ├── index.js              # Express server entry
│   ├── db.js                 # Database (Turso/libSQL)
│   ├── middleware/
│   │   └── auth.js           # JWT authentication
│   └── routes/
│       ├── auth.js           # Register/login/forgot password
│       ├── tasks.js          # Task CRUD + checklist
│       ├── timer.js          # Timer, manual entry, quick start
│       ├── projects.js       # Project CRUD
│       ├── clients.js        # Client CRUD
│       ├── tags.js           # Tag CRUD + entry tagging
│       ├── reports.js        # Summary/Detailed/Weekly reports
│       ├── history.js        # Analytics and daily reviews
│       ├── export.js         # Data export/import
│       └── google.js         # ICS calendar feed
├── client/
│   ├── capacitor.config.json # Mobile app config
│   ├── src/
│   │   ├── App.jsx           # Main app with navigation
│   │   ├── api.js            # API client (all endpoints)
│   │   ├── hooks/
│   │   │   ├── useTheme.js         # Dark mode
│   │   │   └── useNotification.js  # Browser notifications
│   │   └── components/
│   │       ├── AuthScreen.jsx      # Login/Register/Forgot password
│   │       ├── TimerBar.jsx        # Global quick timer
│   │       ├── DayView.jsx         # Daily task list
│   │       ├── TaskCard.jsx        # Task with timer controls
│   │       ├── TaskModal.jsx       # Create/edit task
│   │       ├── FocusMode.jsx       # Full-screen focus timer
│   │       ├── TimeEntryList.jsx   # Recent entries by day
│   │       ├── ManualEntryModal.jsx# Add time manually
│   │       ├── ProjectsView.jsx    # Manage projects/clients
│   │       ├── TagsManager.jsx     # Manage tags
│   │       ├── ReportsView.jsx     # Summary/Detailed/Weekly
│   │       ├── HistoryView.jsx     # Analytics + export
│   │       └── Settings.jsx        # Profile + Calendar feed
│   └── ...
├── data/                     # Local SQLite (dev only)
├── Dockerfile                # Container deployment
└── render.yaml               # Render.com config
```

## License

Personal project. Free to use.
