# UCU Innovators Frontend

A React + Vite frontend for the UCU Innovators project management platform.

## Prerequisites

- Node.js 18+
- The backend server running at `http://localhost:5000`

## Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at **http://localhost:5173**.

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── context/
│   └── AuthContext.jsx       # Auth state (user, token, login, logout)
├── services/
│   └── api.js                # Axios instance with base URL & auth interceptor
├── components/
│   ├── Navbar.jsx             # Navigation bar with notifications bell
│   ├── Navbar.css
│   ├── ProtectedRoute.jsx     # Auth guard for protected pages
│   └── AdminRoute.jsx         # Admin-only route guard
└── pages/
    ├── LoginPage.jsx
    ├── RegisterPage.jsx
    ├── ProjectsPage.jsx        # Browse + search/filter/sort projects
    ├── ProjectDetailPage.jsx   # Single project with comments
    ├── CreateProjectPage.jsx   # Submit a new project (auth required)
    ├── ProfilePage.jsx         # User profile view/edit + their projects
    ├── NotificationsPage.jsx   # User notifications
    ├── AdminApprovalsPage.jsx  # Approve/reject pending projects (admin)
    ├── AdminUsersPage.jsx      # Manage users + roles (admin)
    └── AdminAnalyticsPage.jsx  # Analytics dashboard (admin)
```

## Features

- 🔐 JWT authentication (stored in localStorage)
- 🔍 Project search, filter by category/faculty, and sort
- 💬 Comments on projects
- 🔔 Notification bell with unread badge
- 📎 File attachment support
- 👤 Profile editing
- ⚡ Admin panel: approvals, user management, analytics

## API Proxy

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:5000` — no CORS configuration needed during development.

