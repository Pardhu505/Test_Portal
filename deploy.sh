#!/bin/bash

# Daily Work Reporting Portal - Quick Deployment Script

echo "🚀 Starting Vercel Backend Deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Login to Vercel (if not already)
echo "🔐 Please login to Vercel..."
vercel login

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Copy your Vercel backend URL"
echo "2. Set up MongoDB Atlas database"
echo "3. Add environment variables in Vercel dashboard:"
echo "   - MONGO_URL"
echo "   - DB_NAME" 
echo "   - SECRET_KEY"
echo "   - CORS_ORIGINS"
echo "4. Update frontend REACT_APP_BACKEND_URL"
echo ""
echo "🎊 Your backend will be live at: https://your-project.vercel.app"