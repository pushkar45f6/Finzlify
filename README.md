# Student Finance

React Native / Expo student-finance app with a Cloudflare Worker API and D1 auth database.

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

Open with Expo Go, Android emulator, or iOS simulator. Expo SecureStore stores the session token on-device; the app never connects to D1 directly.

## Worker checks

```powershell
cd backend
npm run typecheck
npm test
```

Password-reset token generation, hashing, expiry, and one-time verification are implemented. Email delivery is an isolated TODO because Cloudflare Email Sending is not enabled on the available plan. The reset request endpoint does not reveal or return reset tokens.

The dashboard's finance values remain mock data; finance persistence/API endpoints are outside this auth implementation phase.

No production Worker deployment has been performed.

## Prototype features

- Home dashboard
- Budget + safe-to-spend
- Spending alerts
- Upcoming expense calendar
- Quick expense entry
- Goals
- Insights
- Settings
- Hamburger navigation drawer
- AI assistant as a floating bottom-right button
