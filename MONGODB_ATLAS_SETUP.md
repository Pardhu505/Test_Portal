# 🚀 Complete MongoDB Atlas Setup Guide

## Step 1: Create MongoDB Atlas Account

1. **Go to MongoDB Atlas**: https://www.mongodb.com/atlas
2. **Click "Try Free"** (green button)
3. **Sign up with:**
   - Email: your-email@example.com
   - Create strong password
   - Choose "I'm building a new app"

## Step 2: Create Your Free Cluster

### Cluster Configuration:
1. **Choose "M0 Sandbox" (FREE)**
   - Storage: 512 MB
   - RAM: Shared
   - Perfect for your portal!

2. **Select Cloud Provider & Region:**
   - Provider: **AWS** (recommended)
   - Region: **Choose closest to your users**
   - Example: `us-east-1` (N. Virginia) for US users

3. **Cluster Name:** 
   - Enter: `showtime-cluster`

4. **Click "Create Cluster"** (takes 3-5 minutes)

## Step 3: Database Security Setup

### Create Database User:
1. **Go to "Database Access"** (left sidebar)
2. **Click "Add New Database User"**
3. **Authentication Method:** Password
4. **Username:** `showtime_admin`
5. **Password:** Generate secure password (save this!)
6. **Database User Privileges:** 
   - Select "Read and write to any database"
7. **Click "Add User"**

### Network Access (IMPORTANT):
1. **Go to "Network Access"** (left sidebar)
2. **Click "Add IP Address"**
3. **Choose "Allow Access from Anywhere"** (0.0.0.0/0)
   - This is needed for Vercel serverless functions
4. **Click "Confirm"**

## Step 4: Get Connection String

1. **Go to "Clusters"** (Database → Clusters)
2. **Click "Connect"** on your cluster
3. **Choose "Connect your application"**
4. **Driver:** Python
5. **Version:** 3.11 or later
6. **Copy the connection string:**
   ```
   mongodb+srv://showtime_admin:<password>@showtime-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. **Replace `<password>` with your actual password**
8. **Add database name at the end:**
   ```
   mongodb+srv://showtime_admin:yourpassword@showtime-cluster.xxxxx.mongodb.net/showtime_reports?retryWrites=true&w=majority
   ```

## Step 5: Test Connection (Optional)

### Using MongoDB Compass:
1. Download MongoDB Compass (GUI tool)
2. Paste your connection string
3. Click "Connect"
4. You should see your `showtime_reports` database

✅ **MongoDB Atlas Setup Complete!**
Your database is now ready for production use.

---

## 🔐 Security Checklist:
- ✅ Strong database password
- ✅ Network access configured
- ✅ Read/write permissions set
- ✅ Connection string secured

## 📊 What You Get FREE:
- **512 MB Storage** (handles ~10,000 work reports)
- **Shared RAM** (perfect for small teams)
- **Daily Backups** (data protection)
- **99.95% Uptime SLA**
- **SSL/TLS Encryption**

## 🔄 Data Migration:
Your existing local data will be automatically recreated when users start using the live app!

---
**Next:** Use this connection string in Vercel environment variables.