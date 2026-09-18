# Egypt Telecom Subscription Platform

Arabic-first subscription management for customers, merchants, and admins.

## Local setup

1. Install Node.js 20 or newer.
2. Create `backend/.env` from `backend/.env.example`.
3. Run `npm run setup` from the repository root.
4. Run `npm run db:push --prefix backend`.
5. For local demo data only, set `SEED_DEMO_DATA=true`, `SEED_PASSWORD`, `SEED_ADMIN_PHONE`, `SEED_MERCHANT_PHONE`, `SEED_CUSTOMER_PHONE`, `SEED_MERCHANT_CUSTOMER_PHONE`, and `SEED_APP_PASSWORD`, then run `npm run db:seed --prefix backend`.
6. Start the API with `npm run dev:backend`.
7. Start the frontend in a second terminal with `npm run dev:frontend`.

The frontend is served at `http://localhost:5173` and the API at `http://localhost:12001`.

## Security notes

- Sessions use HttpOnly cookies; no auth token is stored in localStorage.
- Telecom app passwords are encrypted with AES-256-GCM and are never returned to customers.
- Set strong `APP_SECRET` and `CRED_ENCRYPTION_KEY` values before production deployment.
- Payment screenshots are validated and stored in the private Supabase Storage bucket configured by `SUPABASE_STORAGE_BUCKET`.
- Merchant invitations and merchant-created customer accounts use single-use activation links instead of predictable passwords.
- `PUBLIC_APP_URL`, `CORS_ORIGIN`, `APP_SECRET`, `CRED_ENCRYPTION_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are required for production flows.
