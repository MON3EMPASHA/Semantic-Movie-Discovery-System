# Environment Variable Setup

## Backend API URL Configuration

The frontend needs to know where the backend API is located. This is configured via the `NEXT_PUBLIC_API_BASE_URL` environment variable.

### Production Backend URL
```
https://semantic-movie-discovery-system-production.up.railway.app/api
```

### Local Development
For local development, the default is:
```
http://localhost:4000/api
```

## Setting Environment Variables

### For Local Development
Create a `.env.local` file in the `frontend/` directory:
```env
NEXT_PUBLIC_API_BASE_URL=https://semantic-movie-discovery-system-production.up.railway.app/api
```

### For Netlify Deployment
1. Go to your Netlify dashboard: https://app.netlify.com
2. Select your site
3. Navigate to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add:
   - **Key**: `NEXT_PUBLIC_API_BASE_URL`
   - **Value**: `https://semantic-movie-discovery-system-production.up.railway.app/api`
   - **Scopes**: All scopes (or Production)
6. Click **Save**
7. **Redeploy** your site (environment variables are embedded at build time)

## Verification

After setting the environment variable, you can verify it's working by:
1. Opening the browser console on your deployed site
2. In development mode, you'll see: `API Base URL: https://semantic-movie-discovery-system-production.up.railway.app/api`
3. Check the Network tab to see API requests going to the Railway URL instead of localhost

## Important Notes

- Environment variables starting with `NEXT_PUBLIC_` are embedded at **build time**
- You must **redeploy** after adding or changing these variables
- The URL must end with `/api` (no trailing slash)
- The URL must use `https://` (not `http://`) for production
