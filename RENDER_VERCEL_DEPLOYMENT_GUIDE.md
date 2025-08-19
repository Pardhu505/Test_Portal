# 🚀 Render Backend + Vercel Frontend Deployment Guide

## 📋 **Overview**

- **Backend**: Deploy on Render (persistent containers, better for databases)
- **Frontend**: Deploy on Vercel (optimized for React apps)
- **Database**: MongoDB Atlas (cloud database)

---

## 🔧 **STEP 1: Prepare Backend for Render**

### 1.1 Create Render Configuration Files

Create these files in your `/backend` folder:

**File: `/backend/render.yaml`**
```yaml
services:
  - type: web
    name: showtime-backend
    runtime: python3
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn server:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: MONGO_URL
        sync: false
      - key: DB_NAME
        value: showtime_reports
      - key: SECRET_KEY
        sync: false
      - key: CORS_ORIGINS
        sync: false
      - key: ENVIRONMENT
        value: production
```

**File: `/backend/requirements.txt`** (verify it has all dependencies)
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
motor==3.3.2
python-dotenv==1.0.0
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pytz==2023.3
pymongo==4.6.0
```

### 1.2 Update Server.py for Render

Update the port configuration in `server.py`:

```python
# Add this at the end of server.py (replace existing if present)
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

---

## 🌐 **STEP 2: Deploy Backend on Render**

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended)
3. Connect your GitHub repository

### 2.2 Deploy Backend
1. **Click "New +"** → **"Web Service"**
2. **Connect Repository**: Select your GitHub repo
3. **Configuration**:
   ```
   Name: showtime-backend
   Root Directory: backend
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn server:app --host 0.0.0.0 --port $PORT
   ```

### 2.3 Set Environment Variables
In Render Dashboard → Your Service → Environment:

```env
MONGO_URL = mongodb+srv://username:password@cluster.mongodb.net/showtime_reports?retryWrites=true&w=majority
DB_NAME = showtime_reports
SECRET_KEY = your-super-secure-secret-key-minimum-32-characters
CORS_ORIGINS = https://your-frontend.vercel.app,http://localhost:3000
ENVIRONMENT = production
```

### 2.4 Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Your backend will be at: `https://showtime-backend.onrender.com`

---

## 🎯 **STEP 3: Test Backend Deployment**

### 3.1 Health Check
Visit: `https://showtime-backend.onrender.com/api/health`

**Expected Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "users_count": 25,
  "departments_available": 10
}
```

### 3.2 Test Departments API
Visit: `https://showtime-backend.onrender.com/api/departments`

**Expected**: JSON with all department/team data

---

## ⚛️ **STEP 4: Deploy Frontend on Vercel**

### 4.1 Update Frontend Environment
Create/update `/frontend/.env.production`:

```env
REACT_APP_BACKEND_URL=https://showtime-backend.onrender.com
```

### 4.2 Deploy Frontend
1. Go to [vercel.com](https://vercel.com)
2. **Import Project** from GitHub
3. **Configuration**:
   ```
   Framework Preset: Create React App
   Root Directory: frontend
   Build Command: yarn build (or npm run build)
   Output Directory: build
   ```

### 4.3 Set Environment Variables
In Vercel Dashboard → Your Project → Settings → Environment Variables:

```env
REACT_APP_BACKEND_URL = https://showtime-backend.onrender.com
```

### 4.4 Deploy
1. Click **"Deploy"**
2. Your frontend will be at: `https://showtime-portal.vercel.app`

---

## 🔄 **STEP 5: Connect Frontend & Backend**

### 5.1 Update CORS
Go back to Render → Your Backend → Environment Variables:

Update `CORS_ORIGINS`:
```env
CORS_ORIGINS = https://showtime-portal.vercel.app,http://localhost:3000
```

### 5.2 Redeploy Backend
Click **"Manual Deploy"** in Render dashboard

---

## 🧪 **STEP 6: Final Testing**

### 6.1 Test Complete Flow
1. **Open**: `https://showtime-portal.vercel.app`
2. **Login**: `test@showtimeconsulting.in` / `Welcome@123`
3. **Test Features**:
   - ✅ Department dropdown loads
   - ✅ Daily report submission
   - ✅ RM's team report view
   - ✅ Enhanced PDF export with attendance
   - ✅ Manager delete functionality

### 6.2 Test New Features
1. **Enhanced PDF Export**:
   - Go to RM's Team Report
   - Click "Export PDF"
   - Verify attendance summary section

2. **Delete Functionality**:
   - Login as manager
   - Try deleting a report
   - Confirm it works

---

## 🔧 **Troubleshooting Guide**

### Backend Issues:

**❌ "Application failed to start"**
- Check Render logs
- Verify `requirements.txt` has all dependencies
- Ensure `uvicorn` start command is correct

**❌ "Database connection failed"**
- Verify MongoDB Atlas connection string
- Check network access (whitelist 0.0.0.0/0)
- Ensure database user has proper permissions

**❌ "CORS errors"**
- Update `CORS_ORIGINS` with exact frontend URL
- Redeploy backend after CORS update

### Frontend Issues:

**❌ "Cannot connect to backend"**
- Verify `REACT_APP_BACKEND_URL` is correct
- Check if backend is running: `/api/health`
- Ensure no trailing slashes in URL

**❌ "Department dropdown empty"**
- Check browser console for errors
- Test backend directly: `/api/departments`
- Verify CORS configuration

---

## 🎯 **Production URLs**

After successful deployment:

- **Backend API**: `https://showtime-backend.onrender.com`
- **Frontend Portal**: `https://showtime-portal.vercel.app`
- **Health Check**: `https://showtime-backend.onrender.com/api/health`

---

## 🌟 **Advantages of This Setup**

### Render Backend:
✅ **Persistent containers** (better for database connections)
✅ **No cold starts** (faster response times)
✅ **Built-in SSL** and custom domains
✅ **Automatic deployments** from GitHub
✅ **Better for FastAPI** applications

### Vercel Frontend:
✅ **Optimized for React** applications
✅ **Global CDN** for fast loading
✅ **Automatic HTTPS** and domains
✅ **Preview deployments** for testing
✅ **Perfect for static sites**

---

## 💰 **Cost Information**

### Render:
- **Free Tier**: 750 hours/month (enough for 1 app)
- **Paid Plans**: Start at $7/month for always-on service

### Vercel:
- **Free Tier**: 100GB bandwidth, unlimited sites
- **Paid Plans**: Start at $20/month for teams

**Total Cost**: Can run completely **FREE** on both platforms! 🎉

---

## 🚀 **Ready to Deploy!**

Follow these steps in order and you'll have a production-ready deployment with:
- ✅ Stable backend on Render
- ✅ Fast frontend on Vercel  
- ✅ Enhanced PDF export with attendance
- ✅ Manager delete functionality
- ✅ All features working perfectly

Let me know if you need help with any specific step! 🎯