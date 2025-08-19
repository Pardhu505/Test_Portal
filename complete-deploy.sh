#!/bin/bash

# 🚀 Complete Deployment Automation Script
# Daily Work Reporting Portal - One-Click Deployment

set -e  # Exit on any error

echo "🎯 Daily Work Reporting Portal - Complete Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "server.py" ]; then
    print_error "Please run this script from the backend directory"
    exit 1
fi

# Step 1: Check and install Vercel CLI
echo ""
print_info "Step 1: Checking Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
    print_status "Vercel CLI installed successfully"
else
    print_status "Vercel CLI already installed"
fi

# Step 2: Check if user is logged in
echo ""
print_info "Step 2: Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    print_warning "Please login to Vercel..."
    vercel login
else
    print_status "Already logged in to Vercel"
fi

# Step 3: Deploy backend
echo ""
print_info "Step 3: Deploying backend to Vercel..."
print_warning "When prompted:"
print_warning "- Project name: showtime-backend"
print_warning "- Directory: ./"
print_warning "- Link to existing project: No"

vercel --prod

# Get the deployment URL
BACKEND_URL=$(vercel --scope $(vercel whoami) ls | grep showtime-backend | awk '{print $2}' | head -1)

if [ -z "$BACKEND_URL" ]; then
    # Fallback: ask user for URL
    echo ""
    print_warning "Please enter your backend Vercel URL (e.g., https://showtime-backend.vercel.app):"
    read BACKEND_URL
fi

print_status "Backend deployed successfully!"
print_info "Backend URL: $BACKEND_URL"

# Step 4: Environment Variables Reminder
echo ""
print_info "Step 4: Environment Variables Setup"
print_warning "IMPORTANT: Set these environment variables in Vercel Dashboard:"
echo ""
echo -e "${YELLOW}Go to: https://vercel.com/dashboard → showtime-backend → Settings → Environment Variables${NC}"
echo ""
echo "Add these variables:"
echo "===================="
echo "MONGO_URL = mongodb+srv://username:password@cluster.mongodb.net/showtime_reports"
echo "DB_NAME = showtime_reports"
echo "SECRET_KEY = $(openssl rand -base64 32)"
echo "CORS_ORIGINS = https://your-frontend.vercel.app,http://localhost:3000"
echo "ENVIRONMENT = production"
echo ""

# Step 5: MongoDB Atlas Setup Reminder
echo ""
print_info "Step 5: MongoDB Atlas Setup"
print_warning "If you haven't set up MongoDB Atlas yet:"
echo "1. Go to: https://www.mongodb.com/atlas"
echo "2. Create free cluster"
echo "3. Create database user"
echo "4. Whitelist all IPs (0.0.0.0/0)"
echo "5. Get connection string"
echo ""
print_info "Detailed guide: ./MONGODB_ATLAS_SETUP.md"

# Step 6: Frontend Deployment
echo ""
print_info "Step 6: Frontend Deployment"
print_warning "To deploy frontend:"
echo "1. cd ../frontend"
echo "2. Create .env.production with: REACT_APP_BACKEND_URL=$BACKEND_URL"
echo "3. Run: vercel --prod"
echo "4. Update CORS_ORIGINS in backend with frontend URL"
echo ""

# Step 7: Testing Checklist
echo ""
print_info "Step 7: Testing Checklist"
echo "After setting environment variables and redeploying:"
echo "✅ Test API: $BACKEND_URL/api/departments"
echo "✅ Test login: Frontend → Login with test@showtimeconsulting.in"
echo "✅ Test reports: Create and view work reports"
echo "✅ Test PDF export: Download team reports"
echo "✅ Test dark mode: Toggle theme"
echo ""

# Success message
echo ""
print_status "Deployment script completed!"
print_info "Next steps:"
echo "1. Set environment variables in Vercel Dashboard"
echo "2. Deploy frontend using similar process"
echo "3. Update CORS settings"
echo "4. Test your live application"
echo ""
print_info "Your backend API will be available at: $BACKEND_URL"
echo ""
print_status "🎊 Happy deploying!"