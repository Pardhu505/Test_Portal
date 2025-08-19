import requests
import json
import unittest
import os

# Get the backend URL from the frontend .env file
with open('/app/frontend/.env', 'r') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BACKEND_URL = line.strip().split('=')[1].strip('"')
            break

# API base URL
API_URL = f"{BACKEND_URL}/api"

class LifespanChangeTest(unittest.TestCase):
    """
    Tests specifically focused on verifying functionality after FastAPI lifespan changes.
    """
    
    def test_01_authentication_with_predefined_user(self):
        """Test login with predefined user credentials"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"email": "test@showtimeconsulting.in", "password": "Welcome@123"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], "test@showtimeconsulting.in")
        print("✅ Authentication with predefined user successful")
        
        # Save token for subsequent tests
        self.token = data["access_token"]
        return self.token
    
    def test_02_verify_user_profile(self):
        """Test /api/auth/me endpoint to verify user profile"""
        token = self.test_01_authentication_with_predefined_user()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{API_URL}/auth/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], "test@showtimeconsulting.in")
        self.assertEqual(data["role"], "employee")
        print("✅ User profile verification successful")
    
    def test_03_department_mapping(self):
        """Test /api/departments endpoint to verify department data"""
        response = requests.get(f"{API_URL}/departments")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("departments", data)
        departments = data["departments"]
        
        # Verify all expected departments are present
        expected_departments = [
            "Soul Centre", "Directors", "Directors team", "Campaign", 
            "Data", "Media", "Research", "DMC", "HR", "Admin"
        ]
        for dept in expected_departments:
            self.assertIn(dept, departments)
        
        # Verify team structure for a few departments
        self.assertIn("Soul Central", departments["Soul Centre"])
        self.assertIn("Field Team", departments["Soul Centre"])
        self.assertIn("Director", departments["Directors"])
        self.assertIn("HR", departments["HR"])
        
        # Verify manager assignments
        self.assertIn("Atia", departments["Soul Centre"]["Soul Central"])
        self.assertIn("Anant Tiwari", departments["Directors"]["Director"])
        self.assertIn("Tejaswini", departments["HR"]["HR"])
        
        print("✅ Department mapping verification successful")
    
    def test_04_status_options(self):
        """Test /api/status-options endpoint"""
        response = requests.get(f"{API_URL}/status-options")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status_options", data)
        status_options = data["status_options"]
        
        # Verify all expected status options are present
        expected_options = ["WIP", "Completed", "Yet to Start", "Delayed"]
        for option in expected_options:
            self.assertIn(option, status_options)
        
        print("✅ Status options verification successful")

if __name__ == "__main__":
    print(f"Testing backend API after lifespan changes at: {API_URL}")
    unittest.main(verbosity=2)