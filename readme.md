# Egypt Telecom Subscription Platform

Arabic-first subscription management for customers, merchants, and admins.

## Local setup

1. Install Node.js 20 or newer.
2. Create `backend/.env` from `backend/.env.example`.
3. Run `npm run setup` from the repository root.
4. Run `npm run db:push --prefix backend`.
5. Run `npm run db:seed --prefix backend`.
6. Start the API with `npm run dev:backend`.
7. Start the frontend in a second terminal with `npm run dev:frontend`.

Demo accounts are printed by the seed command. The frontend is served at `http://localhost:5173` and the API at `http://localhost:12001`.

## Security notes

- Sessions use HttpOnly cookies; no auth token is stored in localStorage.
- Telecom app passwords are encrypted with AES-256-GCM and are never returned to customers.
- Set strong `APP_SECRET` and `CRED_ENCRYPTION_KEY` values before production deployment.
- Payment screenshots are validated and stored with randomized filenames in this MVP. Replace the local storage adapter with private object storage before production.
