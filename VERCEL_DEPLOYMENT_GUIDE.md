# 🚀 Complete Vercel Deployment Guide

## Phase 1: Deploy Backend to Vercel

### Step 1: Install Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Verify installation
vercel --version
```

### Step 2: Login to Vercel
```bash
# Login (opens browser)
vercel login

# Choose your preferred login method:
# - GitHub (recommended for easy integration)
# - GitLab  
# - Bitbucket
# - Email
```

### Step 3: Deploy Backend
```bash
# Navigate to your backend folder
cd your-project/backend

# Deploy to Vercel
vercel

# Follow the prompts:
# ? Set up and deploy "backend"? [Y/n] Y
# ? Which scope do you want to deploy to? [Your Account]
# ? Link to existing project? [n] n
# ? What's your project's name? showtime-backend
# ? In which directory is your code located? ./
```

### Step 4: Set Production Environment Variables

#### Option A: Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Click on your `showtime-backend` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```env
MONGO_URL = mongodb+srv://showtime_admin:yourpassword@showtime-cluster.xxxxx.mongodb.net/showtime_reports?retryWrites=true&w=majority

DB_NAME = showtime_reports

SECRET_KEY = your-super-secure-jwt-secret-key-here

CORS_ORIGINS = https://your-frontend.vercel.app,http://localhost:3000

ENVIRONMENT = production
```

#### Option B: Vercel CLI (Alternative)
```bash
# Set environment variables via CLI
vercel env add MONGO_URL
# Paste your MongoDB connection string

vercel env add DB_NAME
# Enter: showtime_reports

vercel env add SECRET_KEY  
# Enter a strong secret key

vercel env add CORS_ORIGINS
# Enter: https://your-frontend.vercel.app
```

### Step 5: Redeploy with Environment Variables
```bash
# Redeploy to apply environment variables
vercel --prod
```

✅ **Backend Deployment Complete!**
Your API will be available at: `https://showtime-backend.vercel.app`

---

## Phase 2: Deploy Frontend to Vercel

### Step 1: Update Frontend Environment
Create/update `/frontend/.env.production`:
```env
REACT_APP_BACKEND_URL=https://showtime-backend.vercel.app
```

### Step 2: Deploy Frontend
```bash
# Navigate to frontend folder
cd your-project/frontend

# Deploy to Vercel
vercel

# Follow prompts:
# ? Set up and deploy "frontend"? [Y/n] Y
# ? What's your project's name? showtime-portal
# ? In which directory is your code located? ./
```

### Step 3: Set Frontend Environment Variables
In Vercel Dashboard → showtime-portal → Settings → Environment Variables:
```env
REACT_APP_BACKEND_URL = https://showtime-backend.vercel.app
```

### Step 4: Deploy Production Frontend
```bash
vercel --prod
```

✅ **Frontend Deployment Complete!**
Your portal will be available at: `https://showtime-portal.vercel.app`

---

## Phase 3: Connect Frontend & Backend

### Step 1: Update CORS Origins
Go back to your backend project in Vercel Dashboard:
- Update `CORS_ORIGINS` environment variable:
```env
CORS_ORIGINS = https://showtime-portal.vercel.app,http://localhost:3000
```

### Step 2: Redeploy Backend
```bash
cd backend
vercel --prod
```

### Step 3: Test the Live Application
1. Open: `https://showtime-portal.vercel.app`
2. Try logging in with: `test@showtimeconsulting.in` / `Welcome@123`
3. Test all features:
   - ✅ Login/Signup
   - ✅ Daily Reports
   - ✅ Team Reports  
   - ✅ PDF Export
   - ✅ Dark Mode

---

## 🔧 Troubleshooting

### Common Issues:

#### 1. CORS Errors
**Problem:** Frontend can't connect to backend
**Solution:** Update CORS_ORIGINS in backend environment variables

#### 2. Database Connection Failed
**Problem:** MongoDB connection error
**Solution:** 
- Check MONGO_URL format
- Ensure IP whitelist includes 0.0.0.0/0
- Verify username/password

#### 3. Authentication Not Working
**Problem:** Login fails
**Solution:** 
- Check SECRET_KEY is set
- Verify MongoDB connection
- Check browser network tab for errors

### Debug Commands:
```bash
# Check deployment logs
vercel logs

# Check environment variables
vercel env ls

# Force redeploy
vercel --prod --force
```

---

## 🎯 Final Checklist

### Backend Deployment:
- ✅ Vercel project created
- ✅ Environment variables set
- ✅ MongoDB Atlas connected
- ✅ API endpoints working

### Frontend Deployment:
- ✅ Vercel project created  
- ✅ Backend URL configured
- ✅ CORS properly set
- ✅ All features working

### Database:
- ✅ MongoDB Atlas cluster running
- ✅ User authentication configured
- ✅ Network access allowed
- ✅ Connection string working

### Security:
- ✅ HTTPS enabled (automatic)
- ✅ Environment variables secured
- ✅ CORS configured properly
- ✅ JWT secrets set

---

## 🎊 Congratulations!

Your **Daily Work Reporting Portal** is now live in production!

**URLs:**
- **Frontend:** https://showtime-portal.vercel.app
- **Backend API:** https://showtime-backend.vercel.app
- **Database:** MongoDB Atlas Cloud

**Features Working:**
- 👤 User Authentication (Employees & Managers)
- 📝 Daily Work Reports
- 👥 Team Management
- 📊 Analytics & Reports
- 📄 PDF/CSV Export
- 🌙 Dark/Light Mode
- 📱 Mobile Responsive

**Cost:** **FREE** (within generous limits)
**Uptime:** 99.99%
**Global:** Available worldwide
**Secure:** HTTPS + MongoDB encryption

Your portal is production-ready! 🚀