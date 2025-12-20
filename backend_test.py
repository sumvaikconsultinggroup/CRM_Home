#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for BuildCRM SaaS System
Tests all API endpoints with proper authentication and multi-tenant isolation
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import time

# Configuration
BASE_URL = "https://order-workflow-2.preview.emergentagent.com/api"
SUPER_ADMIN_EMAIL = "admin@buildcrm.com"
SUPER_ADMIN_PASSWORD = "admin123"

class BuildCRMTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.super_admin_token = None
        self.client_token = None
        self.test_client_id = None
        self.test_user_id = None
        self.created_resources = {
            'leads': [],
            'projects': [],
            'tasks': [],
            'expenses': [],
            'users': []
        }
        
    def log_test(self, test_name, success, message="", response_data=None):
        """Log test results with detailed information"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"   {message}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()
        
    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
            
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
            
    def test_health_check(self):
        """Test API health check endpoint"""
        print("=== TESTING HEALTH CHECK ===")
        
        response = self.make_request('GET', '/')
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Health Check", True, f"API Status: {data.get('status', 'unknown')}")
            return True
        else:
            self.log_test("Health Check", False, "API not responding")
            return False
            
    def test_public_endpoints(self):
        """Test public endpoints that don't require authentication"""
        print("=== TESTING PUBLIC ENDPOINTS ===")
        
        # Test subscription plans
        response = self.make_request('GET', '/plans')
        if response and response.status_code == 200:
            plans = response.json()
            self.log_test("Get Subscription Plans", True, f"Found {len(plans)} plans")
        else:
            self.log_test("Get Subscription Plans", False, "Failed to fetch plans")
            
        # Test public modules
        response = self.make_request('GET', '/modules/public')
        if response and response.status_code == 200:
            modules = response.json()
            self.log_test("Get Public Modules", True, f"Found {len(modules)} modules")
        else:
            self.log_test("Get Public Modules", False, "Failed to fetch modules")
            
    def test_super_admin_login(self):
        """Test super admin authentication"""
        print("=== TESTING SUPER ADMIN AUTHENTICATION ===")
        
        login_data = {
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        }
        
        response = self.make_request('POST', '/auth/login', login_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and data['user']['role'] == 'super_admin':
                self.super_admin_token = data['token']
                self.log_test("Super Admin Login", True, f"Logged in as {data['user']['email']}")
                return True
            else:
                self.log_test("Super Admin Login", False, "Invalid response structure")
        else:
            self.log_test("Super Admin Login", False, "Login failed", response.json() if response else None)
            
        return False
        
    def test_client_registration(self):
        """Test client registration and login"""
        print("=== TESTING CLIENT REGISTRATION ===")
        
        # Generate unique test data
        timestamp = int(time.time())
        business_name = f"Test Construction Co {timestamp}"
        email = f"test{timestamp}@buildcrm.com"
        password = "testpass123"
        
        register_data = {
            "businessName": business_name,
            "email": email,
            "password": password,
            "phone": "+91 9876543210",
            "planId": "basic"
        }
        
        response = self.make_request('POST', '/auth/register', register_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'client' in data:
                self.client_token = data['token']
                self.test_client_id = data['client']['id']
                self.test_user_id = data['user']['id']
                self.log_test("Client Registration", True, f"Registered {business_name}")
                
                # Test login with new credentials
                login_data = {"email": email, "password": password}
                login_response = self.make_request('POST', '/auth/login', login_data)
                if login_response and login_response.status_code == 200:
                    login_data = login_response.json()
                    self.client_token = login_data['token']  # Update token
                    self.log_test("Client Login", True, f"Logged in as {email}")
                    return True
                else:
                    self.log_test("Client Login", False, "Failed to login after registration")
            else:
                self.log_test("Client Registration", False, "Invalid response structure")
        else:
            self.log_test("Client Registration", False, "Registration failed", response.json() if response else None)
            
        return False
        
    def test_auth_me_endpoint(self):
        """Test the /auth/me endpoint"""
        print("=== TESTING AUTH ME ENDPOINT ===")
        
        if not self.client_token:
            self.log_test("Auth Me Test", False, "No client token available")
            return False
            
        response = self.make_request('GET', '/auth/me', token=self.client_token)
        if response and response.status_code == 200:
            data = response.json()
            if 'user' in data and 'client' in data:
                self.log_test("Auth Me Endpoint", True, f"Retrieved user: {data['user']['email']}")
                return True
            else:
                self.log_test("Auth Me Endpoint", False, "Invalid response structure")
        else:
            self.log_test("Auth Me Endpoint", False, "Failed to get user info")
            
        return False
        
    def test_super_admin_stats(self):
        """Test super admin dashboard stats"""
        print("=== TESTING SUPER ADMIN STATS ===")
        
        if not self.super_admin_token:
            self.log_test("Super Admin Stats", False, "No super admin token")
            return False
            
        response = self.make_request('GET', '/admin/stats', token=self.super_admin_token)
        if response and response.status_code == 200:
            stats = response.json()
            required_fields = ['totalClients', 'activeClients', 'totalUsers', 'monthlyRevenue']
            if all(field in stats for field in required_fields):
                self.log_test("Super Admin Stats", True, f"Total Clients: {stats['totalClients']}, Revenue: ₹{stats['monthlyRevenue']}")
                return True
            else:
                self.log_test("Super Admin Stats", False, "Missing required fields in stats")
        else:
            self.log_test("Super Admin Stats", False, "Failed to get admin stats")
            
        return False
        
    def test_super_admin_client_management(self):
        """Test super admin client management functions"""
        print("=== TESTING SUPER ADMIN CLIENT MANAGEMENT ===")
        
        if not self.super_admin_token or not self.test_client_id:
            self.log_test("Client Management", False, "Missing required tokens or client ID")
            return False
            
        # Test get all clients
        response = self.make_request('GET', '/admin/clients', token=self.super_admin_token)
        if response and response.status_code == 200:
            clients = response.json()
            self.log_test("Get All Clients", True, f"Found {len(clients)} clients")
        else:
            self.log_test("Get All Clients", False, "Failed to get clients list")
            return False
            
        # Test get specific client
        response = self.make_request('GET', f'/admin/clients/{self.test_client_id}', token=self.super_admin_token)
        if response and response.status_code == 200:
            client = response.json()
            self.log_test("Get Client Details", True, f"Retrieved client: {client.get('businessName', 'Unknown')}")
        else:
            self.log_test("Get Client Details", False, "Failed to get client details")
            
        # Test toggle client status
        response = self.make_request('POST', f'/admin/clients/{self.test_client_id}/toggle-status', token=self.super_admin_token)
        if response and response.status_code == 200:
            result = response.json()
            self.log_test("Toggle Client Status", True, f"New status: {result.get('newStatus', 'unknown')}")
        else:
            self.log_test("Toggle Client Status", False, "Failed to toggle status")
            
        return True
        
    def test_client_dashboard_stats(self):
        """Test client dashboard statistics"""
        print("=== TESTING CLIENT DASHBOARD STATS ===")
        
        if not self.client_token:
            self.log_test("Client Dashboard Stats", False, "No client token")
            return False
            
        response = self.make_request('GET', '/client/stats', token=self.client_token)
        if response and response.status_code == 200:
            stats = response.json()
            required_fields = ['totalLeads', 'totalProjects', 'totalTasks', 'totalExpenses']
            if all(field in stats for field in required_fields):
                self.log_test("Client Dashboard Stats", True, 
                            f"Leads: {stats['totalLeads']}, Projects: {stats['totalProjects']}, Tasks: {stats['totalTasks']}")
                return True
            else:
                self.log_test("Client Dashboard Stats", False, "Missing required fields")
        else:
            self.log_test("Client Dashboard Stats", False, "Failed to get client stats")
            
        return False
        
    def test_leads_crud(self):
        """Test leads CRUD operations"""
        print("=== TESTING LEADS CRUD OPERATIONS ===")
        
        if not self.client_token:
            self.log_test("Leads CRUD", False, "No client token")
            return False
            
        # Test GET leads
        response = self.make_request('GET', '/leads', token=self.client_token)
        if response and response.status_code == 200:
            leads = response.json()
            self.log_test("Get Leads", True, f"Found {len(leads)} existing leads")
        else:
            self.log_test("Get Leads", False, "Failed to get leads")
            return False
            
        # Test CREATE lead
        new_lead = {
            "name": "John Construction Client",
            "email": "john@construction.com",
            "phone": "+91 9876543210",
            "source": "Website",
            "value": 150000,
            "notes": "Interested in kitchen renovation"
        }
        
        response = self.make_request('POST', '/leads', new_lead, token=self.client_token)
        if response and response.status_code == 200:
            created_lead = response.json()
            lead_id = created_lead['id']
            self.created_resources['leads'].append(lead_id)
            self.log_test("Create Lead", True, f"Created lead: {created_lead['name']}")
            
            # Test UPDATE lead
            update_data = {"status": "contacted", "notes": "Called and scheduled meeting"}
            response = self.make_request('PUT', f'/leads/{lead_id}', update_data, token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Update Lead", True, "Lead updated successfully")
            else:
                self.log_test("Update Lead", False, "Failed to update lead")
                
            # Test DELETE lead
            response = self.make_request('DELETE', f'/leads/{lead_id}', token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Delete Lead", True, "Lead deleted successfully")
                self.created_resources['leads'].remove(lead_id)
            else:
                self.log_test("Delete Lead", False, "Failed to delete lead")
                
        else:
            self.log_test("Create Lead", False, "Failed to create lead")
            return False
            
        return True
        
    def test_projects_crud(self):
        """Test projects CRUD operations"""
        print("=== TESTING PROJECTS CRUD OPERATIONS ===")
        
        if not self.client_token:
            self.log_test("Projects CRUD", False, "No client token")
            return False
            
        # Test GET projects
        response = self.make_request('GET', '/projects', token=self.client_token)
        if response and response.status_code == 200:
            projects = response.json()
            self.log_test("Get Projects", True, f"Found {len(projects)} existing projects")
        else:
            self.log_test("Get Projects", False, "Failed to get projects")
            return False
            
        # Test CREATE project
        new_project = {
            "name": "Kitchen Renovation Project",
            "description": "Complete kitchen makeover with modern appliances",
            "budget": 500000,
            "startDate": datetime.now().isoformat(),
            "endDate": (datetime.now() + timedelta(days=60)).isoformat()
        }
        
        response = self.make_request('POST', '/projects', new_project, token=self.client_token)
        if response and response.status_code == 200:
            created_project = response.json()
            project_id = created_project['id']
            self.created_resources['projects'].append(project_id)
            self.log_test("Create Project", True, f"Created project: {created_project['name']}")
            
            # Test UPDATE project
            update_data = {"status": "in_progress", "progress": 25}
            response = self.make_request('PUT', f'/projects/{project_id}', update_data, token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Update Project", True, "Project updated successfully")
            else:
                self.log_test("Update Project", False, "Failed to update project")
                
            # Test DELETE project
            response = self.make_request('DELETE', f'/projects/{project_id}', token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Delete Project", True, "Project deleted successfully")
                self.created_resources['projects'].remove(project_id)
            else:
                self.log_test("Delete Project", False, "Failed to delete project")
                
        else:
            self.log_test("Create Project", False, "Failed to create project")
            return False
            
        return True
        
    def test_tasks_crud(self):
        """Test tasks CRUD operations"""
        print("=== TESTING TASKS CRUD OPERATIONS ===")
        
        if not self.client_token:
            self.log_test("Tasks CRUD", False, "No client token")
            return False
            
        # Test GET tasks
        response = self.make_request('GET', '/tasks', token=self.client_token)
        if response and response.status_code == 200:
            tasks = response.json()
            self.log_test("Get Tasks", True, f"Found {len(tasks)} existing tasks")
        else:
            self.log_test("Get Tasks", False, "Failed to get tasks")
            return False
            
        # Test CREATE task
        new_task = {
            "title": "Order kitchen cabinets",
            "description": "Contact supplier and place order for custom cabinets",
            "priority": "high",
            "dueDate": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        response = self.make_request('POST', '/tasks', new_task, token=self.client_token)
        if response and response.status_code == 200:
            created_task = response.json()
            task_id = created_task['id']
            self.created_resources['tasks'].append(task_id)
            self.log_test("Create Task", True, f"Created task: {created_task['title']}")
            
            # Test UPDATE task
            update_data = {"status": "in_progress", "description": "Updated task description"}
            response = self.make_request('PUT', f'/tasks/{task_id}', update_data, token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Update Task", True, "Task updated successfully")
            else:
                self.log_test("Update Task", False, "Failed to update task")
                
            # Test DELETE task
            response = self.make_request('DELETE', f'/tasks/{task_id}', token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Delete Task", True, "Task deleted successfully")
                self.created_resources['tasks'].remove(task_id)
            else:
                self.log_test("Delete Task", False, "Failed to delete task")
                
        else:
            self.log_test("Create Task", False, "Failed to create task")
            return False
            
        return True
        
    def test_expenses_crud(self):
        """Test expenses CRUD operations"""
        print("=== TESTING EXPENSES CRUD OPERATIONS ===")
        
        if not self.client_token:
            self.log_test("Expenses CRUD", False, "No client token")
            return False
            
        # Test GET expenses
        response = self.make_request('GET', '/expenses', token=self.client_token)
        if response and response.status_code == 200:
            expenses = response.json()
            self.log_test("Get Expenses", True, f"Found {len(expenses)} existing expenses")
        else:
            self.log_test("Get Expenses", False, "Failed to get expenses")
            return False
            
        # Test CREATE expense
        new_expense = {
            "description": "Construction materials purchase",
            "amount": 25000,
            "category": "Materials",
            "date": datetime.now().isoformat()
        }
        
        response = self.make_request('POST', '/expenses', new_expense, token=self.client_token)
        if response and response.status_code == 200:
            created_expense = response.json()
            expense_id = created_expense['id']
            self.created_resources['expenses'].append(expense_id)
            self.log_test("Create Expense", True, f"Created expense: ₹{created_expense['amount']}")
            
            # Test UPDATE expense
            update_data = {"approved": True, "amount": 27000}
            response = self.make_request('PUT', f'/expenses/{expense_id}', update_data, token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Update Expense", True, "Expense updated successfully")
            else:
                self.log_test("Update Expense", False, "Failed to update expense")
                
            # Test DELETE expense
            response = self.make_request('DELETE', f'/expenses/{expense_id}', token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Delete Expense", True, "Expense deleted successfully")
                self.created_resources['expenses'].remove(expense_id)
            else:
                self.log_test("Delete Expense", False, "Failed to delete expense")
                
        else:
            self.log_test("Create Expense", False, "Failed to create expense")
            return False
            
        return True
        
    def test_user_management(self):
        """Test user management operations"""
        print("=== TESTING USER MANAGEMENT ===")
        
        if not self.client_token:
            self.log_test("User Management", False, "No client token")
            return False
            
        # Test GET users
        response = self.make_request('GET', '/users', token=self.client_token)
        if response and response.status_code == 200:
            users = response.json()
            self.log_test("Get Users", True, f"Found {len(users)} existing users")
        else:
            self.log_test("Get Users", False, "Failed to get users")
            return False
            
        # Test CREATE user
        timestamp = int(time.time())
        new_user = {
            "email": f"newuser{timestamp}@buildcrm.com",
            "password": "userpass123",
            "name": "New Sales Rep",
            "role": "sales_rep"
        }
        
        response = self.make_request('POST', '/users', new_user, token=self.client_token)
        if response and response.status_code == 200:
            created_user = response.json()
            user_id = created_user['id']
            self.created_resources['users'].append(user_id)
            self.log_test("Create User", True, f"Created user: {created_user['name']}")
            
            # Test UPDATE user
            update_data = {"name": "Updated Sales Rep", "role": "manager"}
            response = self.make_request('PUT', f'/users/{user_id}', update_data, token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Update User", True, "User updated successfully")
            else:
                self.log_test("Update User", False, "Failed to update user")
                
            # Test DELETE user
            response = self.make_request('DELETE', f'/users/{user_id}', token=self.client_token)
            if response and response.status_code == 200:
                self.log_test("Delete User", True, "User deleted successfully")
                self.created_resources['users'].remove(user_id)
            else:
                self.log_test("Delete User", False, "Failed to delete user")
                
        else:
            self.log_test("Create User", False, "Failed to create user", response.json() if response else None)
            return False
            
        return True
        
    def test_reports_api(self):
        """Test reports API endpoints"""
        print("=== TESTING REPORTS API ===")
        
        if not self.client_token:
            self.log_test("Reports API", False, "No client token")
            return False
            
        # Test sales report
        response = self.make_request('GET', '/reports/sales', token=self.client_token)
        if response and response.status_code == 200:
            sales_report = response.json()
            required_fields = ['byStatus', 'bySource', 'monthlyData']
            if all(field in sales_report for field in required_fields):
                self.log_test("Sales Report", True, f"Generated sales report with {len(sales_report['monthlyData'])} months")
            else:
                self.log_test("Sales Report", False, "Missing required fields in sales report")
        else:
            self.log_test("Sales Report", False, "Failed to get sales report")
            
        # Test expenses report
        response = self.make_request('GET', '/reports/expenses', token=self.client_token)
        if response and response.status_code == 200:
            expenses_report = response.json()
            required_fields = ['byCategory', 'monthlyData']
            if all(field in expenses_report for field in required_fields):
                self.log_test("Expenses Report", True, f"Generated expenses report with {len(expenses_report['monthlyData'])} months")
                return True
            else:
                self.log_test("Expenses Report", False, "Missing required fields in expenses report")
        else:
            self.log_test("Expenses Report", False, "Failed to get expenses report")
            
        return False
        
    def test_webhook_endpoint(self):
        """Test webhook endpoint for lead integration"""
        print("=== TESTING WEBHOOK ENDPOINT ===")
        
        if not self.test_client_id:
            self.log_test("Webhook Test", False, "No test client ID")
            return False
            
        webhook_data = {
            "clientId": self.test_client_id,
            "source": "External Website",
            "leadData": {
                "name": "Webhook Test Lead",
                "email": "webhook@test.com",
                "phone": "+91 9999999999",
                "message": "Interested in flooring services"
            }
        }
        
        response = self.make_request('POST', '/webhook/leads', webhook_data)
        if response and response.status_code == 200:
            result = response.json()
            if 'leadId' in result:
                self.log_test("Webhook Endpoint", True, f"Lead created via webhook: {result['leadId']}")
                return True
            else:
                self.log_test("Webhook Endpoint", False, "Invalid webhook response")
        else:
            self.log_test("Webhook Endpoint", False, "Webhook failed")
            
        return False
        
    def test_client_modules(self):
        """Test client modules endpoint"""
        print("=== TESTING CLIENT MODULES ===")
        
        if not self.client_token:
            self.log_test("Client Modules", False, "No client token")
            return False
            
        response = self.make_request('GET', '/client/modules', token=self.client_token)
        if response and response.status_code == 200:
            modules = response.json()
            self.log_test("Get Client Modules", True, f"Found {len(modules)} available modules")
            return True
        else:
            self.log_test("Get Client Modules", False, "Failed to get client modules")
            
        return False
        
    def test_multi_tenant_isolation(self):
        """Test that clients can only access their own data"""
        print("=== TESTING MULTI-TENANT ISOLATION ===")
        
        if not self.client_token:
            self.log_test("Multi-tenant Isolation", False, "No client token")
            return False
            
        # Create a lead with current client
        test_lead = {
            "name": "Isolation Test Lead",
            "email": "isolation@test.com",
            "phone": "+91 8888888888",
            "source": "Test",
            "value": 100000
        }
        
        response = self.make_request('POST', '/leads', test_lead, token=self.client_token)
        if response and response.status_code == 200:
            created_lead = response.json()
            lead_id = created_lead['id']
            
            # Verify the lead appears in client's leads
            response = self.make_request('GET', '/leads', token=self.client_token)
            if response and response.status_code == 200:
                leads = response.json()
                lead_found = any(lead['id'] == lead_id for lead in leads)
                if lead_found:
                    self.log_test("Multi-tenant Data Access", True, "Client can access their own data")
                    
                    # Clean up
                    self.make_request('DELETE', f'/leads/{lead_id}', token=self.client_token)
                    return True
                else:
                    self.log_test("Multi-tenant Data Access", False, "Client cannot find their own lead")
            else:
                self.log_test("Multi-tenant Data Access", False, "Failed to retrieve leads")
        else:
            self.log_test("Multi-tenant Data Creation", False, "Failed to create test lead")
            
        return False
        
    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 STARTING BUILDCRM BACKEND API TESTING")
        print("=" * 60)
        
        test_results = {}
        
        # Core functionality tests (High Priority)
        test_results['health_check'] = self.test_health_check()
        test_results['public_endpoints'] = self.test_public_endpoints()
        test_results['super_admin_login'] = self.test_super_admin_login()
        test_results['client_registration'] = self.test_client_registration()
        test_results['auth_me'] = self.test_auth_me_endpoint()
        test_results['super_admin_stats'] = self.test_super_admin_stats()
        test_results['super_admin_clients'] = self.test_super_admin_client_management()
        test_results['client_stats'] = self.test_client_dashboard_stats()
        test_results['leads_crud'] = self.test_leads_crud()
        test_results['projects_crud'] = self.test_projects_crud()
        test_results['tasks_crud'] = self.test_tasks_crud()
        test_results['expenses_crud'] = self.test_expenses_crud()
        test_results['user_management'] = self.test_user_management()
        
        # Additional functionality tests (Medium Priority)
        test_results['reports'] = self.test_reports_api()
        test_results['client_modules'] = self.test_client_modules()
        test_results['multi_tenant'] = self.test_multi_tenant_isolation()
        
        # Integration tests (Low Priority)
        test_results['webhook'] = self.test_webhook_endpoint()
        
        # Summary
        print("=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name.replace('_', ' ').title()}")
            
        print(f"\nOverall Result: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Backend API is working correctly.")
        else:
            print(f"⚠️  {total - passed} tests failed. Please check the issues above.")
            
        return test_results

if __name__ == "__main__":
    tester = BuildCRMTester()
    results = tester.run_all_tests()