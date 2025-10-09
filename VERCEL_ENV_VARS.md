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
