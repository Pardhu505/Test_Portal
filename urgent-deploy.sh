#!/bin/bash

# 🚀 URGENT FIX: Deploy Backend to Vercel
# This will make your portal accessible to everyone

echo "🔧 FIXING DEPLOYMENT ISSUE"
echo "=========================="

# Check if we're in the backend directory
if [ ! -f "server.py" ]; then
    echo "❌ Please run this from your backend directory"
    echo "📁 Navigate to: cd your-project/backend"
    exit 1
fi

echo "✅ Found backend files"

# Step 1: Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Step 2: Quick deployment
echo ""
echo "🚀 Deploying backend to Vercel..."
echo "⚠️  When prompted, choose:"
echo "   - Project name: showtime-backend"
echo "   - Directory: ./"
echo "   - Deploy: Yes"

# Deploy to production
vercel --prod

echo ""
echo "✅ Backend deployment initiated!"
echo ""
echo "📋 NEXT STEPS (CRITICAL):"
echo "1. Copy the Vercel URL from above (e.g., https://showtime-backend-xxx.vercel.app)"
echo "2. Go to Vercel Dashboard → showtime-backend → Settings → Environment Variables"
echo "3. Add these environment variables:"
echo ""
echo "   MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/showtime_reports"
echo "   DB_NAME=showtime_reports"
echo "   SECRET_KEY=$(openssl rand -base64 32)"
echo "   CORS_ORIGINS=https://your-frontend.vercel.app"
echo "   ENVIRONMENT=production"
echo ""
echo "4. Redeploy backend: vercel --prod"
echo "5. Update frontend environment variable"
echo ""
echo "🔗 Vercel Dashboard: https://vercel.com/dashboard"