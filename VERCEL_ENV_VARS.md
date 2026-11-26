# Vercel Environment Variables

Add these environment variables in your Vercel project settings:

## Required Environment Variables

### Supabase Configuration
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Backend API Configuration
```
VITE_BACKEND_URL=https://your-backend-api.vercel.app/api/v1
```

### PayPal Checkout (optional)
```
VITE_PAYPAL_CLIENT_ID=your-paypal-sandbox-client-id
```
Defaults to `sb`, PayPal's public sandbox demo client id, if unset. With only
`sb` (or when the API's `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` are unset),
checkout step 3 falls back to an on-screen "simulate success / simulate
failure" panel instead of the real PayPal Buttons, so the order → payment →
orders flow is still fully exercisable. Set a real PayPal REST app's client id
here (and its client id/secret on the API — see below) to pay with an actual
PayPal sandbox buyer account instead.

### Google reCAPTCHA (optional)
```
# v3 (score based) — invisible check on every page load
VITE_RECAPTCHA_V3_SITE_KEY=your-v3-site-key
RECAPTCHA_V3_SECRET_KEY=your-v3-secret-key

# v2 (checkbox) — shown when the v3 score is low, and on sign-in / sign-up
VITE_RECAPTCHA_SITE_KEY=your-v2-site-key
RECAPTCHA_SECRET_KEY=your-v2-secret-key
```
reCAPTCHA keys only work for the type they were created as, so v3 and v2 need
**separate key pairs** (create each in https://www.google.com/recaptcha/admin).

- **Page load (v3):** when the app loads, reCAPTCHA v3 scores the visitor
  invisibly and `/api/verify-recaptcha` checks the score. Visitors below
  `RECAPTCHA_MIN_SCORE` (optional, default `0.5`) get a full-page "I'm not a
  robot" checkbox (v2). With no v2 key set, they get a "couldn't verify" screen
  with a retry button instead. If the check itself can't run (Google blocked or
  down), the visitor is let through. Passing is remembered for the browser tab.
- **Sign-in / sign-up (v2):** the checkbox on those forms is verified before the
  request reaches the backend.
- Site keys (`VITE_*`) are public and built into the browser bundle. Secret keys
  must **not** have the `VITE_` prefix: only the serverless function reads them.
- Leave a site key unset to switch that part off.
- Redeploy after adding them: `VITE_*` values are read at build time.
- In the reCAPTCHA admin console, add your production domain, `vercel.app`
  (preview deployments) and `localhost` to each key.
- `/api` functions do not run under `npm run dev`; use `vercel dev` to test the
  checks locally, or leave the site keys unset in `.env.local`.

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables" in the sidebar
4. Add each variable:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: `https://your-project-id.supabase.co`
   - **Environment**: Production, Preview, Development (select all)
5. Repeat for all variables above

## Getting Supabase Values

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings > API
4. Copy:
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **anon/public key** → Use as `VITE_SUPABASE_ANON_KEY`

## Getting Backend URL

- If using Vercel for backend: `https://your-backend-project.vercel.app/api/v1`
- If using other hosting: `https://your-backend-domain.com/api/v1`
- For development: `http://localhost:8080/api/v1`
