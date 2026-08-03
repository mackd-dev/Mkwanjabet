# PrimeOdds Backend Foundation

## 1. Requirements
- Node.js 20+
- Docker Desktop (recommended) or an existing PostgreSQL database

## 2. Configure environment
Copy `.env.example` to `.env`.

Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

macOS/Linux:
```bash
cp .env.example .env
```

Change `JWT_SECRET` before production.

## 3. Start PostgreSQL
```bash
docker compose up -d postgres
```

## 4. Install and prepare database
```bash
npm install
npm run db:generate
npm run db:migrate -- --name initial_backend
npm run db:seed
```

## 5. Start PrimeOdds
```bash
npm run dev -- --hostname 0.0.0.0
```

## 6. Test API
- `GET http://localhost:3000/api/health`
- `GET http://localhost:3000/api/picks/today`
- `GET http://localhost:3000/api/picks/real-madrid-vs-bayern-btts`
- `GET http://localhost:3000/api/results`
- `GET http://localhost:3000/api/plans`

Demo login:
- Phone: `255700000001`
- Password: `PrimeOdds123!`

Login request:
```json
POST /api/auth/login
{
  "identifier": "255700000001",
  "password": "PrimeOdds123!"
}
```

## Current backend scope
- PostgreSQL schema
- Prisma ORM
- Seed data
- Cookie-based JWT sessions
- Registration, login, logout and current-user APIs
- Public picks, pick details, results and plans APIs
- Premium picks are locked in public API responses

## Next backend sprint
- Connect Login/Register UI to auth APIs
- Replace Picks/Results/Premium mock arrays with API data
- Subscription and payment initiation endpoints
- Saved picks and notifications endpoints
- OTP provider integration
