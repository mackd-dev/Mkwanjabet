# MkwanjaBet V15 — Account, Wallet & My Bets

Production-oriented sportsbook workspace with Next.js frontend, NestJS API, PostgreSQL and Prisma.

## V15 additions

- Premium wallet dashboard with available, withdrawable and bonus balances
- Mobile-money deposit and withdrawal flows (demo UI, API-ready)
- Transaction history and auditable wallet-ledger schema
- My Bets with open, won, lost and cash-out ticket details
- Profile and security screens
- NIDA KYC workflow and document-upload interface
- Responsible gaming deposit, loss, stake and session limits
- New API modules: wallet, bets, KYC and responsible gaming
- Prisma models for wallet ledger, bet tickets, selections, KYC and player limits

## Test locally

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000/wallet`, `/my-bets`, `/account/kyc`, or `/account/responsible-gaming`.

For the API, regenerate Prisma after pulling V15:

```bash
cd api
npm install
npx prisma generate
npx prisma migrate dev --name v15_wallet_bets_kyc
npm run start:dev
```

Payment requests and KYC uploads remain demo/API-ready until production provider credentials, object storage and regulatory workflows are connected.

## V16 betting engine

V16 adds real booking codes, stake and payout validation, atomic wallet locking, accepted bet tickets, status history, per-outcome exposure tracking, cash-out offer storage, and administrator risk endpoints.

New public endpoints:

- `POST /api/v1/betting/booking`
- `GET /api/v1/betting/booking/:code`

Authenticated endpoints:

- `POST /api/v1/betting/validate`
- `POST /api/v1/betting/place`

Administrator endpoints:

- `GET /api/v1/admin/risk/dashboard`
- `GET /api/v1/admin/risk/bets`
- `GET /api/v1/admin/risk/bookings`
- `PATCH /api/v1/admin/risk/bookings/:id/cancel`
- `GET /api/v1/admin/risk/limits`
- `POST /api/v1/admin/risk/limits`

Run `npm install`, `npx prisma generate`, and `npx prisma migrate dev` inside `api/` before starting the updated API.
