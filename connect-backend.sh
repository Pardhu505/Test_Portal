#!/bin/bash

# 🔗 Connect Frontend to Deployed Backend

echo "🔗 CONNECTING FRONTEND TO DEPLOYED BACKEND"
echo "=========================================="

# Get backend URL
echo "📝 Please enter your deployed backend URL:"
echo "   (e.g., https://showtime-backend-abc123.vercel.app)"
read -p "Backend URL: " BACKEND_URL

# Validate URL
if [[ ! "$BACKEND_URL" =~ ^https:// ]]; then
    echo "❌ Please enter a valid HTTPS URL"
    exit 1
fi

# Check if we're in frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this from your frontend directory"
    echo "📁 Navigate to: cd your-project/frontend"
    exit 1
fi

# Create production environment file
echo "📝 Creating production environment file..."
echo "REACT_APP_BACKEND_URL=$BACKEND_URL" > .env.production

echo "✅ Environment file created!"
echo ""
echo "📋 Contents of .env.production:"
cat .env.production

echo ""
echo "🚀 Deploying frontend with new backend URL..."

# Deploy to Vercel
if command -v vercel &> /dev/null; then
    vercel --prod
    echo ""
    echo "✅ Frontend redeployed with new backend connection!"
else
    echo "❌ Vercel CLI not found. Please install it:"
    echo "   npm install -g vercel"
    echo "   Then run: vercel --prod"
fi

echo ""
echo "🎯 TESTING CHECKLIST:"
echo "1. Open your frontend URL"
echo "2. Try to signup - departments should load"
echo "3. Try to login - authentication should work"
echo "4. Share URL with others - they should be able to signup"
echo ""
echo "🎊 Your portal is now fully public and accessible!"