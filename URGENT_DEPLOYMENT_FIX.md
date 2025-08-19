# 🚨 URGENT: Frontend Can't Connect to Backend

## The Problem
Your frontend is deployed on Vercel, but your backend (containing team mapping and authentication) is running locally. Others can't access your local server.

## Quick Fix (15 minutes)

### Step 1: Deploy Backend to Vercel
```bash
cd your-backend-folder
./urgent-deploy.sh
```

### Step 2: Setup MongoDB Atlas (if not done)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create FREE cluster
3. Create database user
4. Allow all IPs (0.0.0.0/0)
5. Get connection string

### Step 3: Set Environment Variables in Vercel
Go to: Vercel Dashboard → showtime-backend → Settings → Environment Variables

Add these:
```env
MONGO_URL = mongodb+srv://username:password@cluster.mongodb.net/showtime_reports
DB_NAME = showtime_reports  
SECRET_KEY = your-secure-32-character-key
CORS_ORIGINS = https://your-frontend.vercel.app
ENVIRONMENT = production
```

### Step 4: Update Frontend Environment
In your frontend Vercel project → Settings → Environment Variables:
```env
REACT_APP_BACKEND_URL = https://showtime-backend-xxx.vercel.app
```

### Step 5: Redeploy Both
```bash
# Redeploy backend
vercel --prod

# Redeploy frontend  
cd ../frontend
vercel --prod
```

## Test the Fix
1. Share your frontend URL with someone
2. They should be able to:
   - ✅ See signup page
   - ✅ Select departments
   - ✅ Create account
   - ✅ Login and use portal

## Why This Happened
- Frontend: `https://your-frontend.vercel.app` (public)
- Backend: `http://localhost:8001` (your computer only)
- Solution: Both must be on Vercel (public)

## After Fix
- Frontend: `https://your-frontend.vercel.app` (public)
- Backend: `https://showtime-backend.vercel.app` (public)
- Result: ✅ Everyone can access your portal!

---

**Time to fix: ~15 minutes**
**Cost: FREE**
**Result: Fully functional public portal**