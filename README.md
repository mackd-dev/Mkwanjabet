# MkwanjaBet V13 — Sportsbook Experience Foundation

This workspace contains a separated production architecture plus the V13 sportsbook user experience:

- Responsive sportsbook match centre
- Pre-match and live event tabs
- Desktop and mobile betslip
- Accumulator calculations and quick stakes
- Booking-code interface
- Jackpot, promotions, live, my-bets and wallet route foundations
- Responsible-gaming surfaces

Core workspace:

- `frontend/` — Next.js user-facing application
- `api/` — dedicated NestJS REST API
- PostgreSQL — isolated Docker database
- `deploy/` — Nginx and backup assets

## Local development

1. Copy `.env.example` to `.env` and replace secrets.
2. Copy `api/.env.example` to `api/.env` for non-Docker API development.
3. Run `docker compose up -d mkwanjabet-postgres`.
4. In `api/`: `npm install`, `npm run prisma:generate`, `npm run db:migrate -- --name initial`, `npm run db:seed`, `npm run start:dev`.
5. In `frontend/`: `npm install`, copy `.env.example` to `.env.local`, then `npm run dev`.

## Production

See `DEPLOY-HETZNER.md`.

## Main API routes

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/picks/today`
- `GET /api/v1/picks/:slug`
- `GET /api/v1/results`
- `GET /api/v1/plans`
- `GET|PATCH /api/v1/users/me`
- `GET|POST|DELETE /api/v1/saved-picks`
- `GET|PATCH /api/v1/notifications`
- `GET /api/v1/subscriptions/me`
- `GET /api/v1/payments/me`
- `POST /api/v1/payments/initiate`

Payment initiation currently creates a pending payment record. Provider callbacks and real mobile-money integration are intentionally not faked and must be implemented with the selected payment gateway.
