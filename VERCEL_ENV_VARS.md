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
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
```
Adds a reCAPTCHA v2 "I'm not a robot" checkbox to the sign-in page, the
sign-in modal and the sign-up page. The token is checked by the
`/api/verify-recaptcha` Vercel function before the request reaches the backend.

- `VITE_RECAPTCHA_SITE_KEY` is public and is built into the browser bundle.
- `RECAPTCHA_SECRET_KEY` must **not** have the `VITE_` prefix: it is read only
  by the serverless function and must never reach the browser.
- Optional `RECAPTCHA_MIN_SCORE` (default `0.5`) only applies to v3 keys.
- Leave `VITE_RECAPTCHA_SITE_KEY` unset to turn reCAPTCHA off (the forms then
  work exactly as before).
- Redeploy after adding them: `VITE_*` values are read at build time.
- In the reCAPTCHA admin console (https://www.google.com/recaptcha/admin), add
  your production domain, `vercel.app` (preview deployments) and `localhost`.
- `/api` functions do not run under `npm run dev`; use `vercel dev` to test the
  check locally, or leave the site key unset in `.env.local`.

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
