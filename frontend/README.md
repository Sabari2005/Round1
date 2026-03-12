# Frontend

React + Vite frontend for the Genie Lamp contest platform.

## Pages

- `/`: magical landing page
- `/dashboard/auth`: team login and registration
- `/dashboard`: contestant dashboard with current question, answer form, and leaderboard
- `/admin/login`: admin login
- `/admin`: admin panel for question control, submission review, and scoring configuration

## Environment

Create `.env` if needed:

```env
VITE_API_URL="http://localhost:4000"
VITE_SOCKET_URL="http://localhost:4000"
```

## Run

```powershell
npm install
npm run dev
```
