# ProjectHub — Full Stack MVP

A student collaboration platform where users create profiles, publish projects, discover projects, and apply to join teams.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Auth: JWT + bcrypt
- Local DB: Docker Compose

## Run locally

### 1. Requirements
Node.js 20+, npm, and Docker Desktop.

### 2. Install dependencies
```bash
npm install
```

### 3. Start PostgreSQL
```bash
docker compose up -d
```

### 4. Configure backend
Copy `server/.env.example` to `server/.env` and set a strong JWT_SECRET.

### 5. Generate Prisma client + migrate
```bash
npm run db:generate
npm run db:migrate
```

### 6. Start API
```bash
npm run server
```


### 7. Start frontend
In another terminal:
```bash
npm run dev
```


## API
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/me`
- `PUT /api/users/me`
- `GET /api/projects?q=`
- `POST /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects/:id/apply`
- `PATCH /api/projects/:id/applications/:applicationId`

## Next production steps
Email verification, password reset, refresh tokens/httpOnly cookies, rate limiting, image storage, notifications, chat/WebSockets, moderation/admin tools, tests, CI/CD, monitoring, and production database hosting.
