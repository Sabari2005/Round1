# Hosting Guide

This project currently runs with SQLite for local development.
For production hosting, use PostgreSQL.

Recommended stack:
- Backend + PostgreSQL: Railway
- Frontend: Netlify or Vercel

## 1) Prepare backend for PostgreSQL on Railway

1. Open Railway and create a new project.
2. Add a PostgreSQL service.
3. Add a backend service from this repository folder:
   - Root directory: backend
   - Build command: npm install && npx prisma generate && npm run build
   - Start command: npm run start
4. Set backend environment variables:
   - DATABASE_URL = (Railway PostgreSQL connection string)
   - PORT = 4000
   - JWT_SECRET = choose a long random value
   - FRONTEND_URL = your frontend production URL
   - ADMIN_USERNAME = admin
   - ADMIN_PASSWORD = strong password
5. Run Prisma migration on Railway backend shell:
   - npx prisma migrate deploy
6. Seed admin user once:
   - npm run seed:admin

## 2) Deploy frontend

Option A: Netlify
1. Create a new site from this repository.
2. Configure:
   - Base directory: frontend
   - Build command: npm run build
   - Publish directory: frontend/dist
3. Set environment variables:
   - VITE_API_URL = your Railway backend URL (for example https://your-backend.up.railway.app)
   - VITE_SOCKET_URL = same Railway backend URL
4. Deploy.

Option B: Vercel
1. Import repository.
2. Framework preset: Vite.
3. Root directory: frontend.
4. Build command: npm run build.
5. Output directory: dist.
6. Set:
   - VITE_API_URL = Railway backend URL
   - VITE_SOCKET_URL = Railway backend URL
7. Deploy.

## 3) Update backend CORS

After frontend deploy, ensure backend FRONTEND_URL matches your final frontend URL exactly.
Redeploy backend if you changed this variable.

## 4) Verify production

1. Open frontend URL.
2. Register a team.
3. Login as team.
4. Login as admin.
5. Create a question.
6. Submit team answer.
7. Mark answers correct/incorrect in admin panel.
8. Confirm leaderboard updates in real time.

## Notes

- Local development remains SQLite using backend/.env.
- Production should use PostgreSQL for reliability and multi-user persistence.
- If WebSocket connection fails in production, confirm VITE_SOCKET_URL uses the same HTTPS backend domain.
