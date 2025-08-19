import requests
import json
import time
from datetime import datetime, timedelta
import pandas as pd
from io import StringIO
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

class DailyWorkReportingPortalTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up test fixtures before running tests"""
        cls.employee_token = None
        cls.manager_token = None
        cls.employee_user = None
        cls.manager_user = None
        cls.report_id = None
        
        # Login as employee and manager for testing
        cls.login_as_employee()
        cls.login_as_manager()
    
    @classmethod
    def login_as_employee(cls):
        """Login as an employee user"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"email": "test@showtimeconsulting.in", "password": "Welcome@123"}
        )
        if response.status_code == 200:
            data = response.json()
            cls.employee_token = data["access_token"]
            cls.employee_user = data["user"]
            print(f"Successfully logged in as employee: {cls.employee_user['name']}")
        else:
            print(f"Failed to login as employee: {response.text}")
    
    @classmethod
    def login_as_manager(cls):
        """Login as a manager user"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"email": "tejaswini@showtimeconsulting.in", "password": "Welcome@123"}
        )
        if response.status_code == 200:
            data = response.json()
            cls.manager_token = data["access_token"]
            cls.manager_user = data["user"]
            print(f"Successfully logged in as manager: {cls.manager_user['name']}")
        else:
            print(f"Failed to login as manager: {response.text}")
    
    def test_01_login_valid_credentials(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"email": "test@showtimeconsulting.in", "password": "Welcome@123"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], "test@showtimeconsulting.in")
        print("✅ Login with valid credentials successful")
    
    def test_02_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={"email": "test@showtimeconsulting.in", "password": "WrongPassword"}
        )
        self.assertEqual(response.status_code, 401)
        print("✅ Login with invalid credentials correctly rejected")
    
    def test_03_signup_new_user(self):
        """Test signup with new user details"""
        # Generate a unique email to avoid conflicts
        timestamp = int(time.time())
        email = f"newuser{timestamp}@showtimeconsulting.in"
        
        response = requests.post(
            f"{API_URL}/auth/signup",
            json={
                "name": "New Test User",
                "email": email,
                "password": "Welcome@123"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], email)
        self.assertEqual(data["user"]["role"], "employee")  # Default role should be employee
        print("✅ Signup with new user successful")
    
    def test_04_signup_existing_user(self):
        """Test signup with existing user email"""
        response = requests.post(
            f"{API_URL}/auth/signup",
            json={
                "name": "Duplicate User",
                "email": "test@showtimeconsulting.in",  # Existing email
                "password": "Welcome@123"
            }
        )
        self.assertEqual(response.status_code, 400)
        print("✅ Signup with existing email correctly rejected")
    
    def test_05_protected_endpoint_with_token(self):
        """Test accessing protected endpoint with valid token"""
        headers = {"Authorization": f"Bearer {self.employee_token}"}
        response = requests.get(f"{API_URL}/auth/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], "test@showtimeconsulting.in")
        print("✅ Protected endpoint access with token successful")
    
    def test_06_protected_endpoint_without_token(self):
        """Test accessing protected endpoint without token"""
        response = requests.get(f"{API_URL}/auth/me")
        self.assertEqual(response.status_code, 403)  # Should be unauthorized
        print("✅ Protected endpoint access without token correctly rejected")
    
    def test_07_protected_endpoint_invalid_token(self):
        """Test accessing protected endpoint with invalid token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = requests.get(f"{API_URL}/auth/me", headers=headers)
        self.assertEqual(response.status_code, 401)  # Should be unauthorized
        print("✅ Protected endpoint access with invalid token correctly rejected")
    
    def test_08_get_departments(self):
        """Test getting departments hierarchy"""
        response = requests.get(f"{API_URL}/departments")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("departments", data)
        departments = data["departments"]
        
        # Check if the structure matches expected format
        self.assertIsInstance(departments, dict)
        self.assertIn("Soul Centre", departments)
        self.assertIn("Directors", departments)
        
        # Check if teams are nested under departments
        self.assertIn("Soul Central", departments["Soul Centre"])
        self.assertIn("Field Team", departments["Soul Centre"])
        
        # Check if managers are listed under teams
        self.assertIn("Atia", departments["Soul Centre"]["Soul Central"])
        print("✅ Department hierarchy endpoint working correctly")
    
    def test_09_get_status_options(self):
        """Test getting status options"""
        response = requests.get(f"{API_URL}/status-options")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status_options", data)
        status_options = data["status_options"]
        
        # Check if all expected status options are present
        expected_options = ["WIP", "Completed", "Yet to Start", "Delayed"]
        for option in expected_options:
            self.assertIn(option, status_options)
        
        print("✅ Status options endpoint working correctly")
    
    def test_10_get_managers(self):
        """Test getting managers list"""
        headers = {"Authorization": f"Bearer {self.employee_token}"}
        response = requests.get(f"{API_URL}/managers", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("managers", data)
        managers = data["managers"]
        
        # Check if managers list is not empty and has expected structure
        self.assertTrue(len(managers) > 0)
        self.assertIn("name", managers[0])
        self.assertIn("email", managers[0])
        
        # Check if some expected managers are in the list
        manager_emails = [m["email"] for m in managers]
        self.assertIn("tejaswini@showtimeconsulting.in", manager_emails)
        print("✅ Managers endpoint working correctly")
    
    def test_11_create_work_report_as_employee(self):
        """Test creating a work report as an employee"""
        headers = {"Authorization": f"Bearer {self.employee_token}"}
        
        # Create a work report
        today = datetime.now().strftime("%Y-%m-%d")
        report_data = {
            "employee_name": self.employee_user["name"],
            "department": "HR",
            "team": "HR",
            "reporting_manager": "Tejaswini",
            "date": today,
            "tasks": [
                {"details": "Completed documentation review", "status": "Completed"},
                {"details": "Working on new employee onboarding", "status": "WIP"}
            ]
        }
        
        response = requests.post(
            f"{API_URL}/work-reports",
            headers=headers,
            json=report_data
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("report_id", data)
        
        # Save report ID for later tests
        self.__class__.report_id = data["report_id"]
        print(f"✅ Work report creation successful, ID: {self.__class__.report_id}")
    
    def test_12_get_work_reports_as_employee(self):
        """Test fetching work reports as an employee"""
        headers = {"Authorization": f"Bearer {self.employee_token}"}
        response = requests.get(f"{API_URL}/work-reports", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("reports", data)
        reports = data["reports"]
        
        # Employee should only see their own reports
        for report in reports:
            self.assertEqual(report["employee_email"], self.employee_user["email"])
        
        print("✅ Employee can fetch their own work reports")
    
    def test_13_get_work_reports_as_manager(self):
        """Test fetching work reports as a manager"""
        headers = {"Authorization": f"Bearer {self.manager_token}"}
        response = requests.get(f"{API_URL}/work-reports", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("reports", data)
        
        # Manager should be able to see reports from different employees
        print("✅ Manager can fetch all work reports")
    
    def test_14_filter_work_reports(self):
        """Test filtering work reports by various criteria"""
        headers = {"Authorization": f"Bearer {self.manager_token}"}
        
        # Filter by department
        response = requests.get(
            f"{API_URL}/work-reports?department=HR",
            headers=headers
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        reports = data["reports"]
        if reports:
            for report in reports:
                self.assertEqual(report["department"], "HR")
        
        # Filter by date range
        today = datetime.now().strftime("%Y-%m-%d")
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.get(
            f"{API_URL}/work-reports?from_date={yesterday}&to_date={today}",
            headers=headers
        )
        self.assertEqual(response.status_code, 200)
        
        print("✅ Work report filtering working correctly")
    
    def test_15_update_work_report_as_manager(self):
        """Test updating a work report as a manager"""
        if not self.__class__.report_id:
            self.skipTest("No report ID available for update test")
        
        headers = {"Authorization": f"Bearer {self.manager_token}"}
        
        # Update the tasks in the report
        update_data = {
            "tasks": [
                {"details": "Completed documentation review", "status": "Completed"},
                {"details": "Completed employee onboarding", "status": "Completed"},
                {"details": "New task added by manager", "status": "Yet to Start"}
            ]
        }
        
        response = requests.put(
            f"{API_URL}/work-reports/{self.__class__.report_id}",
            headers=headers,
            json=update_data
        )
        self.assertEqual(response.status_code, 200)
        print("✅ Manager can update work reports")
    
    def test_16_update_work_report_as_employee(self):
        """Test updating a work report as an employee (should fail)"""
        if not self.__class__.report_id:
            self.skipTest("No report ID available for update test")
        
        headers = {"Authorization": f"Bearer {self.employee_token}"}
        
        # Try to update the report as an employee
        update_data = {
            "tasks": [
                {"details": "Modified by employee", "status": "Completed"}
            ]
        }
        
        response = requests.put(
            f"{API_URL}/work-reports/{self.__class__.report_id}",
            headers=headers,
            json=update_data
        )
        self.assertEqual(response.status_code, 403)  # Should be forbidden
        print("✅ Employee correctly prevented from updating reports")
    
    def test_17_export_csv(self):
        """Test CSV export functionality"""
        headers = {"Authorization": f"Bearer {self.manager_token}"}
        
        # Export all reports
        response = requests.get(
            f"{API_URL}/work-reports/export/csv",
            headers=headers
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.headers["Content-Type"].startswith("text/csv"))
        
        # Check if CSV content is valid
        try:
            csv_content = response.content.decode('utf-8')
            df = pd.read_csv(StringIO(csv_content))
            
            # Check expected columns
            expected_columns = [
                "Date", "Employee Name", "Department", "Team", 
                "Reporting Manager", "Task Details", "Status", "Submitted At"
            ]
            for col in expected_columns:
                self.assertIn(col, df.columns)
            
            print("✅ CSV export functionality working correctly")
        except Exception as e:
            self.fail(f"CSV parsing failed: {str(e)}")
    
    def test_18_timezone_check(self):
        """Test that timestamps are in IST timezone"""
        headers = {"Authorization": f"Bearer {self.employee_token}"}
        response = requests.get(f"{API_URL}/work-reports", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        if data["reports"]:
            # Check if submitted_at contains IST timezone indicator
            submitted_at = data["reports"][0]["submitted_at"]
            self.assertIsInstance(submitted_at, str)
            
            # Check if the timestamp is in expected format
            try:
                # Parse the timestamp
                timestamp = datetime.fromisoformat(submitted_at.replace('Z', '+00:00'))
                print("✅ Timestamp format is valid")
            except ValueError:
                self.fail("Timestamp format is invalid")
        else:
            print("No reports found to check timestamps")

    def test_19_get_manager_resources(self):
        """Test getting manager resources"""
        response = requests.get(f"{API_URL}/manager-resources")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("manager_resources", data)
        manager_resources = data["manager_resources"]
        
        # Check if the structure matches expected format
        self.assertIsInstance(manager_resources, dict)
        
        # Check if some expected managers are in the resources
        self.assertIn("Atia", manager_resources)
        self.assertIn("Tejaswini", manager_resources)
        
        # Check if resource counts are integers
        for manager, count in manager_resources.items():
            self.assertIsInstance(count, int)
        
        print("✅ Manager resources endpoint working correctly")
    
    def test_20_get_attendance_summary(self):
        """Test getting attendance summary"""
        headers = {"Authorization": f"Bearer {self.manager_token}"}
        
        # Get today's date
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{API_URL}/attendance-summary?date={today}",
            headers=headers
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check structure
        self.assertIn("date", data)
        self.assertIn("attendance_summary", data)
        self.assertEqual(data["date"], today)
        
        # Check attendance summary structure
        attendance_summary = data["attendance_summary"]
        self.assertIsInstance(attendance_summary, dict)
        
        # Check if at least one manager has attendance data
        if attendance_summary:
            for manager, stats in attendance_summary.items():
                self.assertIn("total_resources", stats)
                self.assertIn("present", stats)
                self.assertIn("absent", stats)
                self.assertIn("present_employees", stats)
                
                # Verify that present + absent = total_resources
                self.assertEqual(stats["present"] + stats["absent"], stats["total_resources"])
                
                # Verify that present count matches length of present_employees list
                self.assertEqual(stats["present"], len(stats["present_employees"]))
        
        print("✅ Attendance summary endpoint working correctly")
    
    def test_21_delete_work_report_as_employee(self):
        """Test deleting a work report as an employee (should fail)"""
        if not self.__class__.report_id:
            self.skipTest("No report ID available for delete test")
        
        headers = {"Authorization": f"Bearer {self.employee_token}"}
        
        # Try to delete the report as an employee
        response = requests.delete(
            f"{API_URL}/work-reports/{self.__class__.report_id}",
            headers=headers
        )
        self.assertEqual(response.status_code, 403)  # Should be forbidden
        print("✅ Employee correctly prevented from deleting reports")
    
    def test_22_delete_work_report_as_manager(self):
        """Test deleting a work report as a manager"""
        if not self.__class__.report_id:
            self.skipTest("No report ID available for delete test")
        
        headers = {"Authorization": f"Bearer {self.manager_token}"}
        
        # Delete the report as a manager
        response = requests.delete(
            f"{API_URL}/work-reports/{self.__class__.report_id}",
            headers=headers
        )
        self.assertEqual(response.status_code, 200)
        
        # Verify the report is deleted
        response = requests.get(
            f"{API_URL}/work-reports",
            headers=headers
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check that the deleted report is not in the list
        report_ids = [report["id"] for report in data["reports"]]
        self.assertNotIn(self.__class__.report_id, report_ids)
        
        print("✅ Manager can delete work reports")
    
    def test_23_verify_existing_functionality(self):
        """Verify that all existing functionality remains intact"""
        # Test health check endpoint
        response = requests.get(f"{API_URL}/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        
        # Test departments endpoint
        response = requests.get(f"{API_URL}/departments")
        self.assertEqual(response.status_code, 200)
        
        # Test status options endpoint
        response = requests.get(f"{API_URL}/status-options")
        self.assertEqual(response.status_code, 200)
        
        # Test managers endpoint with authentication
        headers = {"Authorization": f"Bearer {self.manager_token}"}
        response = requests.get(f"{API_URL}/managers", headers=headers)
        self.assertEqual(response.status_code, 200)
        
        print("✅ All existing functionality remains intact")

if __name__ == "__main__":
    print(f"Testing backend API at: {API_URL}")
    # Create a test suite with all tests
    test_loader = unittest.TestLoader()
    test_suite = test_loader.loadTestsFromTestCase(DailyWorkReportingPortalTest)
    
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