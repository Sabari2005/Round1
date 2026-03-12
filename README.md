# Genie Lamp Contest Platform

Modern full-stack realtime quiz platform with a magical black-and-gold UI theme.

## Stack

- Frontend: React + Vite + TypeScript + Socket.io client
- Backend: Node.js + Express + TypeScript + Socket.io
- Database for local development: SQLite + Prisma ORM

## Note On Database Choice

The original build target was PostgreSQL. This workspace has been switched to SQLite for local development because Docker is not installed and no local PostgreSQL server is available on this machine. The application logic, realtime features, scoring flow, and admin/user routes are unchanged.

## Features

- Magical landing page with lamp, glow, sparkles, and smoke-style animation
- Team contestant dashboard with live active question and answer submission
- Secure admin panel for question control and scoring decisions
- Realtime updates for question, submissions, and leaderboard
- Configurable dynamic scoring:
  - First correct answer: full starting score
  - Next correct answers: score decreases by reduction amount
  - Minimum score floor enforced (default 50)
- Deterministic tie-break: server timestamp then submission ID

## Project Structure

- backend/: Express API, Prisma models, scoring engine, Socket.io server
- frontend/: React UI for landing, team dashboard, and admin panel
- docker-compose.yml: optional PostgreSQL container definition if Docker is installed later

## Local Setup

1. Backend setup:
   - `cd backend`
   - `npm install`
   - `npx prisma migrate dev --name init`
   - `npm run seed:admin`
   - `npm run dev`
2. Frontend setup:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

SQLite will create the local database file automatically during migration.

## Default Admin

- Username: `admin`
- Password: `admin123`

## API Overview

### Auth
- POST `/api/auth/team/register`
- POST `/api/auth/team/login`
- POST `/api/auth/admin/login`
- GET `/api/auth/me`

### Team
- GET `/api/user/question`
- POST `/api/user/submit`
- GET `/api/user/leaderboard`

### Admin
- PUT `/api/admin/question`
- GET `/api/admin/submissions`
- PATCH `/api/admin/submissions/:id/score`
- GET `/api/admin/scoring-config`
- PATCH `/api/admin/scoring-config`

## Realtime Events

- `question:update`
- `submission:new`
- `submission:update`
- `leaderboard:update`

## Hosting

See DEPLOYMENT.md for production hosting steps (Railway + PostgreSQL + Netlify/Vercel).
