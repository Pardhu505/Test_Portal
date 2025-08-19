# Daily Work Reporting Portal - Backend Deployment Guide

## 🚀 Vercel Serverless Deployment

Your FastAPI backend is now ready for Vercel deployment! Here's what we've configured:

### ✅ Files Created/Modified:
- `vercel.json` - Vercel configuration for Python/FastAPI
- `server.py` - Updated with Mangum handler for serverless
- `requirements.txt` - Added mangum dependency
- `.env.production` - Environment variables template

### 📋 Deployment Steps:

#### 1. **Setup MongoDB Atlas Database**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create free cluster
   - Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/showtime_reports`
   - Whitelist all IPs: `0.0.0.0/0` (for Vercel)

#### 2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy from backend folder
   cd /path/to/your/backend
   vercel
   ```

#### 3. **Set Environment Variables in Vercel Dashboard**
   - Go to your Vercel project settings
   - Add these environment variables:
     ```
     MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/showtime_reports
     DB_NAME=showtime_reports
     SECRET_KEY=your-super-secure-secret-key
     CORS_ORIGINS=https://your-frontend.vercel.app
     ENVIRONMENT=production
     ```

#### 4. **Update Frontend API URL**
   Update your frontend `.env` with the new backend URL:
   ```
   REACT_APP_BACKEND_URL=https://your-backend.vercel.app
   ```

### 🔧 Key Features Enabled:
- ✅ Serverless deployment with auto-scaling
- ✅ CORS configured for your frontend domain
- ✅ MongoDB Atlas cloud database
- ✅ JWT authentication with secure secrets
- ✅ All API endpoints preserved (/api/*)
- ✅ PDF export functionality maintained

### 🎯 API Endpoints Available:
- `POST /api/auth/login` - User authentication
- `POST /api/auth/signup` - User registration
- `GET /api/auth/me` - Get current user
- `GET /api/departments` - Get department structure
- `POST /api/work-reports` - Create work report
- `GET /api/work-reports` - Get work reports (with filters)
- `PUT /api/work-reports/{id}` - Update work report (managers only)
- `GET /api/work-reports/export/csv` - Export CSV

### 💰 Cost: **FREE TIER**
- Vercel: Free serverless functions
- MongoDB Atlas: 512MB free storage
- Total: $0/month for development/small teams

Your backend is now production-ready! 🎊