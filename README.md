# UCU Innovators

A full-stack project showcase and management platform for Uganda Christian University.

Students submit projects, admins review and approve them, and everyone can browse, search, and comment on approved work.

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | Node.js · Express · MySQL (mysql2)  |
| Frontend | React 19 · Vite · React Router v7   |
| Auth     | JWT (jsonwebtoken) + bcryptjs        |
| Upload   | Multer                              |

---

## Project Structure

```
.
├── server.js              # Express entry point
├── config/
│   └── db.js              # MySQL connection pool
├── middleware/
│   ├── authMiddleware.js  # JWT auth + admin guard
│   └── upload.js          # Multer disk storage
├── routes/
│   ├── authRoutes.js      # POST /api/auth/register|login
│   ├── projectRoutes.js   # GET|POST /api/projects
│   ├── commentRoutes.js   # GET|POST /api/comments
│   ├── approvalRoutes.js  # GET|PUT  /api/approvals
│   ├── analyticsRoutes.js # GET      /api/analytics/dashboard
│   ├── UserRoutes.js      # GET|PUT  /api/users/:id
│   ├── adminRoutes.js     # GET|PUT|DELETE /api/admin/users
│   ├── notificationRoutes.js
│   └── metaRoutes.js      # GET /api/categories|faculties
├── schema.sql             # Database schema + seed data
├── .env.example           # Environment variable template
└── frontend/              # React/Vite SPA
    └── src/
        ├── context/AuthContext.jsx
        ├── services/api.js
        ├── components/
        └── pages/
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.0+

### 1 – Database

```bash
# Create the database and tables
mysql -u root -p < schema.sql
```

The script creates the `ucu_innovators` database, all tables, and seed faculties/categories.

No default admin is seeded. After running the schema, create your first admin account:

1. Register a user via `POST /api/auth/register` (with the backend running).
2. Promote that user to admin in MySQL:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
   ```

### 2 – Backend

```bash
# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# Edit .env and set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET

# Create the uploads directory
mkdir -p uploads

# Start the development server (auto-restarts on change)
npm run dev

# Or start in production mode
npm start
```

The API will be available at **http://localhost:5000**.

### 3 – Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite dev server (proxies /api → localhost:5000)
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## API Overview

| Method | Path                              | Auth     | Description                     |
|--------|-----------------------------------|----------|---------------------------------|
| POST   | /api/auth/register                | –        | Register a new user             |
| POST   | /api/auth/login                   | –        | Login, returns JWT              |
| GET    | /api/projects                     | –        | List/search projects            |
| GET    | /api/projects/:id                 | –        | Get a single project            |
| POST   | /api/projects                     | User     | Submit a new project            |
| GET    | /api/comments/:projectId          | –        | Get comments for a project      |
| POST   | /api/comments                     | User     | Add a comment                   |
| GET    | /api/approvals/pending            | Admin    | List pending projects           |
| PUT    | /api/approvals/approve/:id        | Admin    | Approve a project               |
| PUT    | /api/approvals/reject/:id         | Admin    | Reject a project                |
| GET    | /api/analytics/dashboard          | Admin    | Analytics data                  |
| GET    | /api/users/:id                    | User     | Get user profile                |
| PUT    | /api/users/:id                    | User     | Update user profile             |
| GET    | /api/users/:id/projects           | User     | Get user's own projects         |
| GET    | /api/admin/users                  | Admin    | List all users                  |
| PUT    | /api/admin/users/:id/role         | Admin    | Change user role                |
| DELETE | /api/admin/users/:id              | Admin    | Delete a user                   |
| GET    | /api/notifications/:userId        | User     | Get notifications               |
| PUT    | /api/notifications/read/:id       | User     | Mark notification as read       |
| GET    | /api/categories                   | –        | List categories                 |
| GET    | /api/faculties                    | –        | List faculties                  |

---

## Environment Variables

| Variable      | Default         | Description                     |
|---------------|-----------------|---------------------------------|
| `DB_HOST`     | localhost       | MySQL host                      |
| `DB_USER`     | root            | MySQL username                  |
| `DB_PASSWORD` | *(empty)*       | MySQL password                  |
| `DB_NAME`     | ucu_innovators  | Database name                   |
| `JWT_SECRET`  | secret          | Secret key for signing JWTs     |
| `PORT`        | 5000            | HTTP port the server listens on |
