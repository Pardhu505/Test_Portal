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

class DepartmentsAPITest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up test fixtures before running tests"""
        cls.auth_token = None
        
        # Login to get auth token
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"email": "test@showtimeconsulting.in", "password": "Welcome@123"}
        )
        if response.status_code == 200:
            data = response.json()
            cls.auth_token = data["access_token"]
            print(f"Successfully logged in and obtained auth token")
        else:
            print(f"Failed to login: {response.text}")
    
    def test_01_departments_without_auth(self):
        """Test /api/departments endpoint without authentication"""
        print("\n=== Testing /api/departments without authentication ===")
        response = requests.get(f"{API_URL}/departments")
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {response.headers}")
        
        # Check if the request was successful
        self.assertEqual(response.status_code, 200)
        
        # Parse the response
        data = response.json()
        print(f"Response Data Keys: {data.keys()}")
        
        # Check if the response contains the departments key
        self.assertIn("departments", data)
        
        # Check if the departments data is a dictionary
        self.assertIsInstance(data["departments"], dict)
        
        # Check if the expected departments are present
        expected_departments = [
            "Soul Centre", "Directors", "Directors team", "Campaign", 
            "Data", "Media", "Research", "DMC", "HR", "Admin"
        ]
        for dept in expected_departments:
            self.assertIn(dept, data["departments"])
            print(f"✓ Found department: {dept}")
        
        # Check the structure of a specific department
        soul_centre = data["departments"]["Soul Centre"]
        self.assertIsInstance(soul_centre, dict)
        self.assertIn("Soul Central", soul_centre)
        self.assertIn("Field Team", soul_centre)
        
        # Check if the teams contain the expected managers
        self.assertIn("Atia", soul_centre["Soul Central"])
        self.assertIn("Siddharth Gautam", soul_centre["Field Team"])
        
        print("✅ Departments API works correctly without authentication")
    
    def test_02_departments_with_auth(self):
        """Test /api/departments endpoint with authentication"""
        print("\n=== Testing /api/departments with authentication ===")
        
        if not self.auth_token:
            self.skipTest("No auth token available")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = requests.get(f"{API_URL}/departments", headers=headers)
        
        print(f"Status Code: {response.status_code}")
        
        # Check if the request was successful
        self.assertEqual(response.status_code, 200)
        
        # Parse the response
        data = response.json()
        
        # Check if the response contains the departments key
        self.assertIn("departments", data)
        
        # Check if the departments data is a dictionary
        self.assertIsInstance(data["departments"], dict)
        
        # Check if the expected departments are present
        expected_departments = [
            "Soul Centre", "Directors", "Directors team", "Campaign", 
            "Data", "Media", "Research", "DMC", "HR", "Admin"
        ]
        for dept in expected_departments:
            self.assertIn(dept, data["departments"])
            print(f"✓ Found department: {dept}")
        
        # Check the structure of a specific department
        soul_centre = data["departments"]["Soul Centre"]
        self.assertIsInstance(soul_centre, dict)
        self.assertIn("Soul Central", soul_centre)
        self.assertIn("Field Team", soul_centre)
        
        # Check if the teams contain the expected managers
        self.assertIn("Atia", soul_centre["Soul Central"])
        self.assertIn("Siddharth Gautam", soul_centre["Field Team"])
        
        print("✅ Departments API works correctly with authentication")
    
    def test_03_verify_department_data_constant(self):
        """Verify that the DEPARTMENT_DATA constant is properly defined and returned"""
        print("\n=== Verifying DEPARTMENT_DATA constant ===")
        
        response = requests.get(f"{API_URL}/departments")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check if all expected departments are present
        departments = data["departments"]
        
        # Verify Soul Centre department structure
        self.assertIn("Soul Centre", departments)
        self.assertIn("Soul Central", departments["Soul Centre"])
        self.assertIn("Field Team", departments["Soul Centre"])
        self.assertIn("Atia", departments["Soul Centre"]["Soul Central"])
        self.assertIn("Siddharth Gautam", departments["Soul Centre"]["Field Team"])
        self.assertIn("Sai Kiran Gurram", departments["Soul Centre"]["Field Team"])
        self.assertIn("Akhilesh Mishra", departments["Soul Centre"]["Field Team"])
        
        # Verify Directors department structure
        self.assertIn("Directors", departments)
        self.assertIn("Director", departments["Directors"])
        self.assertIn("Associate Director", departments["Directors"])
        self.assertIn("Anant Tiwari", departments["Directors"]["Director"])
        self.assertIn("Alimpan Banerjee", departments["Directors"]["Associate Director"])
        
        # Verify Directors team department structure
        self.assertIn("Directors team", departments)
        self.assertIn("Directors Team", departments["Directors team"])
        self.assertIn("Himani Sehgal", departments["Directors team"]["Directors Team"])
        self.assertIn("Pawan Beniwal", departments["Directors team"]["Directors Team"])
        self.assertIn("Aditya Pandit", departments["Directors team"]["Directors Team"])
        self.assertIn("Sravya", departments["Directors team"]["Directors Team"])
        self.assertIn("Eshwar", departments["Directors team"]["Directors Team"])
        
        # Verify DMC department structure
        self.assertIn("DMC", departments)
        self.assertIn("HIVE", departments["DMC"])
        self.assertIn("Digital Communication", departments["DMC"])
        self.assertIn("Digital Production", departments["DMC"])
        self.assertIn("Madhunisha and Apoorva", departments["DMC"]["HIVE"])
        self.assertIn("Keerthana", departments["DMC"]["Digital Communication"])
        self.assertIn("Bapan", departments["DMC"]["Digital Production"])
        
        print("✅ DEPARTMENT_DATA constant is properly defined and returned")

if __name__ == "__main__":
    print(f"Testing departments API at: {API_URL}")
    
    # Create a test suite with all tests
    test_loader = unittest.TestLoader()
    test_suite = test_loader.loadTestsFromTestCase(DepartmentsAPITest)
    
    # Run the tests with a text test runner
    test_runner = unittest.TextTestRunner(verbosity=2)
    test_result = test_runner.run(test_suite)
    
    # Print summary
    print("\n=== TEST SUMMARY ===")
    print(f"Total tests: {test_result.testsRun}")
    print(f"Passed: {test_result.testsRun - len(test_result.failures) - len(test_result.errors)}")
    print(f"Failed: {len(test_result.failures)}")
    print(f"Errors: {len(test_result.errors)}")
    
    if test_result.failures:
        print("\n=== FAILURES ===")
        for test, error in test_result.failures:
            print(f"{test}: {error}")
    
    if test_result.errors:
        print("\n=== ERRORS ===")
        for test, error in test_result.errors:
            print(f"{test}: {error}")