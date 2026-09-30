# Student Finance API

Cloudflare Worker API with D1-backed accounts, sessions, profiles, password-reset tokens, and per-user financial transactions. The mobile app talks to this API; it never accesses D1 directly.

## Local development

```powershell
npm install
npm run db:local
npm run dev
```

The Worker listens at `http://localhost:8787`. Configure the Expo app's `EXPO_PUBLIC_API_URL` to that URL. Android emulators and physical devices may need the development machine's LAN address instead of `localhost`.

`npm run db:local` applies all D1 migrations, including the per-user transactions table. Transaction dates are date-only values in `YYYY-MM-DD` format.

## Checks

```powershell
npm run typecheck
npm test
```

Password-reset tokens are generated, stored as SHA-256 digests, expire after 30 minutes, and can be consumed once. Email delivery is intentionally a no-op interface until a permitted delivery channel is available. The request endpoint never returns the token.

No production deployment has been performed. Do not deploy until the API URL, production CORS origins, observability, and reset-email delivery are reviewed.
