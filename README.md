# Student Finance

React Native / Expo student-finance app with a Cloudflare Worker API and per-user D1 data.

## Run the API locally

```powershell
cd backend
npm install
npm run db:local
npm run dev
```

The local API listens at `http://localhost:8787`.

## Run the Expo app

Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL` to the local API URL. Android emulators and physical devices may need the development machine's LAN IP instead of `localhost`.

```powershell
npm install
npx expo start
```

Open with Expo Go, Android emulator, or iOS simulator. Expo SecureStore stores the session token on-device; transactions are loaded from the authenticated API and persisted in D1. The app never connects to D1 directly.

## Worker checks

```powershell
cd backend
npm run typecheck
npm test
```

Password-reset token generation, hashing, expiry, and one-time verification are implemented. Email delivery is an isolated TODO because Cloudflare Email Sending is not enabled on the available plan. The reset request endpoint does not reveal or return reset tokens.

The transaction migration is applied by `npm run db:local`. Apply D1 migrations before deploying the Worker so existing accounts receive the transaction table.

No production Worker deployment has been performed.

## Prototype features

- Home dashboard
- Budget + safe-to-spend
- Spending alerts
- Financial calendar for income and expenses
- Shared income and expense entry, editing, and deletion
- Scheduled and recurring transactions
- Goals
- Insights
- Settings
- Hamburger navigation drawer
- AI assistant as a floating bottom-right button
