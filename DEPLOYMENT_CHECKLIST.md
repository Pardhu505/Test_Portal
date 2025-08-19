# 🚀 DEPLOYMENT CHECKLIST - Render + Vercel

## ✅ **PRE-DEPLOYMENT CHECKLIST**

### Files Created/Updated:
- [x] `/backend/render.yaml` - Render configuration
- [x] `/backend/requirements.txt` - Updated with pytz
- [x] `/backend/server.py` - Added Render port configuration
- [x] `/frontend/.env.production` - Production backend URL

---

## 🎯 **STEP-BY-STEP DEPLOYMENT**

### **PHASE 1: Deploy Backend on Render**

#### 1.1 Setup MongoDB Atlas (if not done)
```
1. Go to https://cloud.mongodb.com
2. Create free cluster (M0)
3. Create database user
4. Whitelist all IPs (0.0.0.0/0)
5. Get connection string
```

#### 1.2 Deploy to Render
```
1. Go to https://render.com
2. Sign up/Login with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - Name: showtime-backend
   - Root Directory: backend
   - Environment: Python 3
   - Build Command: pip install -r requirements.txt
   - Start Command: uvicorn server:app --host 0.0.0.0 --port $PORT
```

#### 1.3 Set Environment Variables in Render
```
MONGO_URL = mongodb+srv://username:password@cluster.mongodb.net/showtime_reports?retryWrites=true&w=majority
DB_NAME = showtime_reports  
SECRET_KEY = your-super-secure-32-character-secret-key
CORS_ORIGINS = http://localhost:3000
ENVIRONMENT = production
```

#### 1.4 Deploy Backend
```
1. Click "Create Web Service"
2. Wait 5-10 minutes for deployment
3. Get your backend URL: https://showtime-backend.onrender.com
```

#### 1.5 Test Backend
```
Visit: https://showtime-backend.onrender.com/api/health
Expected: {"status": "healthy", "database": "connected"}
```

---

### **PHASE 2: Deploy Frontend on Vercel**

#### 2.1 Update Frontend Environment
```
Update /frontend/.env.production with your actual Render URL:
REACT_APP_BACKEND_URL=https://YOUR-ACTUAL-BACKEND-URL.onrender.com
```

#### 2.2 Deploy to Vercel
```
1. Go to https://vercel.com
2. Import project from GitHub
3. Configure:
   - Framework: Create React App
   - Root Directory: frontend
   - Build Command: yarn build
   - Output Directory: build
```

#### 2.3 Set Environment Variables in Vercel
```
REACT_APP_BACKEND_URL = https://YOUR-ACTUAL-BACKEND-URL.onrender.com
```

#### 2.4 Deploy Frontend
```
1. Click "Deploy"
2. Get your frontend URL: https://showtime-portal.vercel.app
```

---

### **PHASE 3: Connect Frontend & Backend**

#### 3.1 Update CORS in Render
```
Go to Render → Your Backend → Environment Variables
Update CORS_ORIGINS:
CORS_ORIGINS = https://YOUR-FRONTEND-URL.vercel.app,http://localhost:3000
```

#### 3.2 Redeploy Backend
```
In Render dashboard: Click "Manual Deploy"
```

---

## 🧪 **TESTING CHECKLIST**

### Backend Tests:
- [ ] Health check: `https://your-backend.onrender.com/api/health`
- [ ] Departments: `https://your-backend.onrender.com/api/departments`
- [ ] Login test with Postman/curl

### Frontend Tests:
- [ ] Open: `https://your-frontend.vercel.app`
- [ ] Login: `test@showtimeconsulting.in` / `Welcome@123`
- [ ] Department dropdown loads
- [ ] Daily report submission works
- [ ] RM's team report accessible (managers only)
- [ ] Enhanced PDF export with attendance
- [ ] Manager delete functionality

### New Feature Tests:
- [ ] **Enhanced PDF Export**: Contains attendance summary + detailed reports
- [ ] **Manager Delete**: Delete button visible and functional for managers
- [ ] **Attendance Tracking**: Shows present/absent counts in PDF

---

## 🚨 **TROUBLESHOOTING**

### Common Issues:

**Backend not starting on Render:**
- Check Render logs
- Verify all environment variables are set
- Ensure MongoDB connection string is correct

**Frontend can't connect to backend:**
- Verify REACT_APP_BACKEND_URL is correct
- Check CORS_ORIGINS includes your frontend URL
- Test backend health endpoint directly

**Database connection failed:**
- Check MongoDB Atlas network access
- Verify connection string format
- Ensure database user has read/write permissions

**CORS errors:**
- Update CORS_ORIGINS with exact URLs (no trailing slashes)
- Redeploy backend after CORS changes

---

## 📊 **EXPECTED RESULTS**

After successful deployment:

### Working URLs:
- **Backend**: `https://showtime-backend.onrender.com`
- **Frontend**: `https://showtime-portal.vercel.app`
- **API Health**: `https://showtime-backend.onrender.com/api/health`

### Working Features:
- ✅ User authentication
- ✅ Department/team selection
- ✅ Daily work reporting
- ✅ Manager team reports
- ✅ **Enhanced PDF export with attendance summary**
- ✅ **Manager delete functionality**
- ✅ Role-based access control

### New Features Confirmed:
- ✅ **Attendance Summary in PDF**: Shows present/absent counts per manager
- ✅ **Manager Delete**: Managers can delete any team member's report
- ✅ **Resource Tracking**: Uses your provided manager resource counts

---

## 🎯 **NEXT STEPS**

1. **Deploy backend on Render** following Phase 1
2. **Deploy frontend on Vercel** following Phase 2  
3. **Connect them** following Phase 3
4. **Test all features** using the testing checklist
5. **Share URLs** with your team

Your enhanced Daily Work Reporting Portal will be live and ready for production use! 🚀