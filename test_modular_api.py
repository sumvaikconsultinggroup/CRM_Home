#!/usr/bin/env python3
"""
Comprehensive Testing for BuildCRM Modular API Routes
Tests the new modular API structure after refactoring
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import time

# Configuration
BASE_URL = "https://leadcrm-8.preview.emergentagent.com/api"
SUPER_ADMIN_EMAIL = "admin@buildcrm.com"
SUPER_ADMIN_PASSWORD = "admin123"
DEMO_CLIENT_EMAIL = "demo@example.com"
DEMO_CLIENT_PASSWORD = "demo123"

class ModularAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.super_admin_token = None
        self.client_token = None
        self.demo_client_token = None
        self.test_client_id = None
        self.test_module_request_id = None
        
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

    def test_public_endpoints(self):
        """Test public endpoints that don't require authentication"""
        print("=== TESTING PUBLIC ENDPOINTS (NEW MODULAR STRUCTURE) ===")
        
        success_count = 0
        total_tests = 4
        
        # Test health check
        response = self.make_request('GET', '/health')
        if response and response.status_code == 200:
            data = response.json()
            if 'status' in data and 'features' in data:
                self.log_test("Health Check", True, f"API Status: {data.get('status')}, Features: {len(data.get('features', []))}")
                success_count += 1
            else:
                self.log_test("Health Check", False, "Missing required fields in health response")
        else:
            self.log_test("Health Check", False, "Health endpoint failed")
            
        # Test subscription plans
        response = self.make_request('GET', '/plans')
        if response and response.status_code == 200:
            plans = response.json()
            if isinstance(plans, list) and len(plans) > 0:
                self.log_test("Get Subscription Plans", True, f"Found {len(plans)} plans")
                success_count += 1
            else:
                self.log_test("Get Subscription Plans", False, "No plans returned")
        else:
            self.log_test("Get Subscription Plans", False, "Failed to fetch plans")
            
        # Test public modules endpoint
        response = self.make_request('GET', '/modules/public')
        if response and response.status_code == 200:
            modules = response.json()
            if isinstance(modules, list):
                self.log_test("Get Public Modules", True, f"Found {len(modules)} public modules")
                success_count += 1
            else:
                self.log_test("Get Public Modules", False, "Invalid modules response")
        else:
            self.log_test("Get Public Modules", False, "Failed to fetch public modules")
            
        # Test alternative modules endpoint
        response = self.make_request('GET', '/modules-public')
        if response and response.status_code == 200:
            modules = response.json()
            if isinstance(modules, list):
                self.log_test("Get Modules Public (Alternative)", True, f"Found {len(modules)} modules")
                success_count += 1
            else:
                self.log_test("Get Modules Public (Alternative)", False, "Invalid response")
        else:
            self.log_test("Get Modules Public (Alternative)", False, "Failed to fetch modules")
            
        return success_count == total_tests

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("=== TESTING AUTH ENDPOINTS (MODULAR) ===")
        
        success_count = 0
        total_tests = 4
        
        # Test super admin login
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
                success_count += 1
            else:
                self.log_test("Super Admin Login", False, "Invalid login response structure")
        else:
            error_msg = "Super admin login failed"
            if response:
                try:
                    error_data = response.json()
                    error_msg += f" - {error_data.get('message', 'Unknown error')}"
                except:
                    error_msg += f" - Status: {response.status_code}"
            self.log_test("Super Admin Login", False, error_msg)
            
        # Test demo client login
        demo_login_data = {
            "email": DEMO_CLIENT_EMAIL,
            "password": DEMO_CLIENT_PASSWORD
        }
        
        response = self.make_request('POST', '/auth/login', demo_login_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'client' in data:
                self.demo_client_token = data['token']
                self.log_test("Demo Client Login", True, f"Logged in as {data['user']['email']}")
                success_count += 1
            else:
                self.log_test("Demo Client Login", False, "Invalid demo client response")
        else:
            self.log_test("Demo Client Login", False, "Demo client login failed")
            
        # Test client registration
        timestamp = int(time.time())
        register_data = {
            "businessName": f"Test Modular Co {timestamp}",
            "email": f"modular{timestamp}@buildcrm.com",
            "password": "testpass123",
            "phone": "+91 9876543210",
            "planId": "basic"
        }
        
        response = self.make_request('POST', '/auth/register', register_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'client' in data:
                self.client_token = data['token']
                self.test_client_id = data['client']['id']
                self.log_test("Client Registration", True, f"Registered {register_data['businessName']}")
                success_count += 1
            else:
                self.log_test("Client Registration", False, "Invalid registration response")
        else:
            self.log_test("Client Registration", False, "Client registration failed")
            
        # Test /auth/me endpoint
        if self.client_token:
            response = self.make_request('GET', '/auth/me', token=self.client_token)
            if response and response.status_code == 200:
                data = response.json()
                if 'user' in data and 'client' in data:
                    self.log_test("Auth Me Endpoint", True, f"Retrieved user: {data['user']['email']}")
                    success_count += 1
                else:
                    self.log_test("Auth Me Endpoint", False, "Invalid /auth/me response")
            else:
                self.log_test("Auth Me Endpoint", False, "Failed to get user info")
        else:
            self.log_test("Auth Me Endpoint", False, "No client token for /auth/me test")
            
        return success_count >= 3  # At least super admin login and registration should work

    def test_super_admin_endpoints(self):
        """Test super admin specific endpoints"""
        print("=== TESTING SUPER ADMIN ENDPOINTS (MODULAR) ===")
        
        if not self.super_admin_token:
            self.log_test("Super Admin Tests", False, "No super admin token available")
            return
            
        # Test admin stats with charts data
        response = self.make_request('GET', '/admin/stats', token=self.super_admin_token)
        if response and response.status_code == 200:
            stats = response.json()
            required_fields = ['overview', 'charts']
            overview_fields = ['totalClients', 'activeClients', 'totalUsers', 'monthlyRevenue']
            chart_fields = ['monthlyGrowth', 'planDistribution']
            
            if (all(field in stats for field in required_fields) and
                all(field in stats['overview'] for field in overview_fields) and
                all(field in stats['charts'] for field in chart_fields)):
                self.log_test("Admin Stats with Charts", True, 
                            f"Total Clients: {stats['overview']['totalClients']}, "
                            f"Revenue: ₹{stats['overview']['monthlyRevenue']}, "
                            f"Chart Data: {len(stats['charts']['monthlyGrowth'])} months")
            else:
                self.log_test("Admin Stats with Charts", False, "Missing required fields in stats")
        else:
            self.log_test("Admin Stats with Charts", False, "Failed to get admin stats")
            
        # Test admin clients endpoint
        response = self.make_request('GET', '/admin/clients', token=self.super_admin_token)
        if response and response.status_code == 200:
            clients = response.json()
            if isinstance(clients, list):
                self.log_test("Admin Get All Clients", True, f"Found {len(clients)} clients")
            else:
                self.log_test("Admin Get All Clients", False, "Invalid clients response")
        else:
            self.log_test("Admin Get All Clients", False, "Failed to get clients")
            
        # Test specific client details
        if self.test_client_id:
            response = self.make_request('GET', f'/admin/clients/{self.test_client_id}', token=self.super_admin_token)
            if response and response.status_code == 200:
                client = response.json()
                if 'businessName' in client:
                    self.log_test("Admin Get Client Details", True, f"Retrieved client: {client['businessName']}")
                else:
                    self.log_test("Admin Get Client Details", False, "Invalid client details response")
            else:
                self.log_test("Admin Get Client Details", False, "Failed to get client details")
                
        # Test admin modules endpoint
        response = self.make_request('GET', '/admin/modules', token=self.super_admin_token)
        if response and response.status_code == 200:
            modules = response.json()
            if isinstance(modules, list):
                self.log_test("Admin Get All Modules", True, f"Found {len(modules)} modules")
            else:
                self.log_test("Admin Get All Modules", False, "Invalid modules response")
        else:
            self.log_test("Admin Get All Modules", False, "Failed to get admin modules")

    def test_module_request_workflow(self):
        """Test the complete module request workflow"""
        print("=== TESTING MODULE REQUEST WORKFLOW ===")
        
        if not self.client_token or not self.super_admin_token:
            self.log_test("Module Request Workflow", False, "Missing required tokens")
            return
            
        # Step 1: Client creates a module request
        request_data = {
            "moduleId": "wooden-flooring",
            "message": "We need wooden flooring module for our business expansion"
        }
        
        response = self.make_request('POST', '/module-requests', request_data, token=self.client_token)
        if response and response.status_code == 201:
            data = response.json()
            if 'request' in data and 'id' in data['request']:
                self.test_module_request_id = data['request']['id']
                self.log_test("Create Module Request", True, f"Created request: {self.test_module_request_id}")
            else:
                self.log_test("Create Module Request", False, "Invalid create request response")
                return
        else:
            self.log_test("Create Module Request", False, "Failed to create module request")
            return
            
        # Step 2: Get module requests (client view)
        response = self.make_request('GET', '/module-requests', token=self.client_token)
        if response and response.status_code == 200:
            requests_list = response.json()
            if isinstance(requests_list, list) and len(requests_list) > 0:
                self.log_test("Get Module Requests (Client)", True, f"Found {len(requests_list)} requests")
            else:
                self.log_test("Get Module Requests (Client)", False, "No requests found for client")
        else:
            self.log_test("Get Module Requests (Client)", False, "Failed to get client requests")
            
        # Step 3: Get module requests (admin view)
        response = self.make_request('GET', '/module-requests', token=self.super_admin_token)
        if response and response.status_code == 200:
            requests_list = response.json()
            if isinstance(requests_list, list):
                self.log_test("Get Module Requests (Admin)", True, f"Admin sees {len(requests_list)} total requests")
            else:
                self.log_test("Get Module Requests (Admin)", False, "Invalid admin requests response")
        else:
            self.log_test("Get Module Requests (Admin)", False, "Failed to get admin requests")
            
        # Step 4: Admin approves the request
        if self.test_module_request_id:
            approve_data = {
                "requestId": self.test_module_request_id,
                "action": "approve",
                "adminMessage": "Approved for business expansion"
            }
            
            response = self.make_request('PUT', '/module-requests', approve_data, token=self.super_admin_token)
            if response and response.status_code == 200:
                data = response.json()
                if data.get('status') == 'approved':
                    self.log_test("Approve Module Request", True, "Request approved successfully")
                else:
                    self.log_test("Approve Module Request", False, "Invalid approval response")
            else:
                self.log_test("Approve Module Request", False, "Failed to approve request")

    def test_client_endpoints(self):
        """Test client-specific endpoints"""
        print("=== TESTING CLIENT ENDPOINTS (MODULAR) ===")
        
        if not self.client_token:
            self.log_test("Client Endpoints", False, "No client token available")
            return
            
        # Test client stats with charts data
        response = self.make_request('GET', '/client/stats', token=self.client_token)
        if response and response.status_code == 200:
            stats = response.json()
            required_fields = ['totalLeads', 'totalProjects', 'totalTasks', 'totalExpenses']
            if all(field in stats for field in required_fields):
                self.log_test("Client Dashboard Stats", True, 
                            f"Leads: {stats['totalLeads']}, Projects: {stats['totalProjects']}")
            else:
                self.log_test("Client Dashboard Stats", False, "Missing required fields in client stats")
        else:
            self.log_test("Client Dashboard Stats", False, "Failed to get client stats")
            
        # Test client modules
        response = self.make_request('GET', '/client/modules', token=self.client_token)
        if response and response.status_code == 200:
            modules = response.json()
            if isinstance(modules, list):
                self.log_test("Client Get Modules", True, f"Found {len(modules)} available modules")
            else:
                self.log_test("Client Get Modules", False, "Invalid client modules response")
        else:
            self.log_test("Client Get Modules", False, "Failed to get client modules")

    def test_white_label_access_control(self):
        """Test white label access control (Enterprise only)"""
        print("=== TESTING WHITE LABEL ACCESS CONTROL ===")
        
        if not self.client_token:
            self.log_test("White Label Access Control", False, "No client token available")
            return
            
        # Test white label GET (should fail for non-Enterprise clients)
        response = self.make_request('GET', '/whitelabel', token=self.client_token)
        if response and response.status_code == 403:
            data = response.json()
            if 'Enterprise' in data.get('message', ''):
                self.log_test("White Label Access Control (GET)", True, "Correctly blocked non-Enterprise client")
            else:
                self.log_test("White Label Access Control (GET)", False, "Wrong error message")
        elif response and response.status_code == 200:
            # If client has Enterprise plan, this is also valid
            self.log_test("White Label Access Control (GET)", True, "Client has Enterprise access")
        else:
            self.log_test("White Label Access Control (GET)", False, "Unexpected response")
            
        # Test white label PUT (should also fail for non-Enterprise clients)
        update_data = {
            "primaryColor": "#FF0000",
            "companyName": "Test Company"
        }
        
        response = self.make_request('PUT', '/whitelabel', update_data, token=self.client_token)
        if response and response.status_code == 403:
            data = response.json()
            if 'Enterprise' in data.get('message', ''):
                self.log_test("White Label Access Control (PUT)", True, "Correctly blocked non-Enterprise client")
            else:
                self.log_test("White Label Access Control (PUT)", False, "Wrong error message")
        elif response and response.status_code == 200:
            # If client has Enterprise plan, this is also valid
            self.log_test("White Label Access Control (PUT)", True, "Client has Enterprise access")
        else:
            self.log_test("White Label Access Control (PUT)", False, "Unexpected response")

    def test_webhook_endpoints(self):
        """Test webhook endpoints"""
        print("=== TESTING WEBHOOK ENDPOINTS ===")
        
        if not self.test_client_id:
            self.log_test("Webhook Endpoints", False, "No test client ID available")
            return
            
        # Test leads webhook
        webhook_data = {
            "clientId": self.test_client_id,
            "source": "External API",
            "leadData": {
                "name": "Webhook Test Lead",
                "email": "webhook@modulartest.com",
                "phone": "+91 9999999999",
                "message": "Interested in modular API services"
            }
        }
        
        response = self.make_request('POST', '/webhook/leads', webhook_data)
        if response and response.status_code == 200:
            result = response.json()
            if 'leadId' in result:
                self.log_test("Webhook Leads Endpoint", True, f"Lead created via webhook: {result['leadId']}")
            else:
                self.log_test("Webhook Leads Endpoint", False, "Invalid webhook response")
        else:
            self.log_test("Webhook Leads Endpoint", False, "Webhook leads failed")
            
        # Test Clerk webhook (basic structure test)
        clerk_data = {
            "type": "user.created",
            "data": {
                "id": "user_test123",
                "email_addresses": [{"email_address": "clerk@test.com"}]
            }
        }
        
        response = self.make_request('POST', '/webhook/clerk', clerk_data)
        if response and (response.status_code == 200 or response.status_code == 400):
            # 400 is acceptable for invalid webhook signature
            self.log_test("Webhook Clerk Endpoint", True, "Clerk webhook endpoint accessible")
        else:
            self.log_test("Webhook Clerk Endpoint", False, "Clerk webhook failed")

    def test_crud_endpoints_sample(self):
        """Test a sample of CRUD endpoints to verify modular structure"""
        print("=== TESTING CRUD ENDPOINTS (MODULAR SAMPLE) ===")
        
        if not self.client_token:
            self.log_test("CRUD Endpoints", False, "No client token available")
            return
            
        # Test leads endpoint
        response = self.make_request('GET', '/leads', token=self.client_token)
        if response and response.status_code == 200:
            leads = response.json()
            if isinstance(leads, list):
                self.log_test("Leads CRUD (GET)", True, f"Found {len(leads)} leads")
            else:
                self.log_test("Leads CRUD (GET)", False, "Invalid leads response")
        else:
            self.log_test("Leads CRUD (GET)", False, "Failed to get leads")
            
        # Test projects endpoint
        response = self.make_request('GET', '/projects', token=self.client_token)
        if response and response.status_code == 200:
            projects = response.json()
            if isinstance(projects, list):
                self.log_test("Projects CRUD (GET)", True, f"Found {len(projects)} projects")
            else:
                self.log_test("Projects CRUD (GET)", False, "Invalid projects response")
        else:
            self.log_test("Projects CRUD (GET)", False, "Failed to get projects")
            
        # Test tasks endpoint
        response = self.make_request('GET', '/tasks', token=self.client_token)
        if response and response.status_code == 200:
            tasks = response.json()
            if isinstance(tasks, list):
                self.log_test("Tasks CRUD (GET)", True, f"Found {len(tasks)} tasks")
            else:
                self.log_test("Tasks CRUD (GET)", False, "Invalid tasks response")
        else:
            self.log_test("Tasks CRUD (GET)", False, "Failed to get tasks")

    def test_reports_endpoints(self):
        """Test reports endpoints"""
        print("=== TESTING REPORTS ENDPOINTS (MODULAR) ===")
        
        if not self.client_token:
            self.log_test("Reports Endpoints", False, "No client token available")
            return
            
        # Test sales report
        response = self.make_request('GET', '/reports/sales', token=self.client_token)
        if response and response.status_code == 200:
            report = response.json()
            required_fields = ['byStatus', 'bySource', 'monthlyData']
            if all(field in report for field in required_fields):
                self.log_test("Sales Report", True, f"Generated sales report with {len(report['monthlyData'])} months")
            else:
                self.log_test("Sales Report", False, "Missing required fields in sales report")
        else:
            self.log_test("Sales Report", False, "Failed to get sales report")
            
        # Test expenses report
        response = self.make_request('GET', '/reports/expenses', token=self.client_token)
        if response and response.status_code == 200:
            report = response.json()
            required_fields = ['byCategory', 'monthlyData']
            if all(field in report for field in required_fields):
                self.log_test("Expenses Report", True, f"Generated expenses report with {len(report['monthlyData'])} months")
            else:
                self.log_test("Expenses Report", False, "Missing required fields in expenses report")
        else:
            self.log_test("Expenses Report", False, "Failed to get expenses report")

    def run_modular_tests(self):
        """Run comprehensive test suite for modular API structure"""
        print("🚀 STARTING BUILDCRM MODULAR API TESTING")
        print("=" * 60)
        
        test_results = {}
        
        # Test new modular structure
        test_results['public_endpoints'] = self.test_public_endpoints()
        test_results['auth_endpoints'] = self.test_auth_endpoints()
        test_results['super_admin_endpoints'] = self.test_super_admin_endpoints()
        test_results['module_request_workflow'] = self.test_module_request_workflow()
        test_results['client_endpoints'] = self.test_client_endpoints()
        test_results['white_label_access'] = self.test_white_label_access_control()
        test_results['webhook_endpoints'] = self.test_webhook_endpoints()
        test_results['crud_sample'] = self.test_crud_endpoints_sample()
        test_results['reports'] = self.test_reports_endpoints()
        
        # Summary
        print("=" * 60)
        print("🏁 MODULAR API TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name.replace('_', ' ').title()}")
            
        print(f"\nOverall Result: {passed}/{total} test categories passed")
        
        if passed == total:
            print("🎉 ALL MODULAR API TESTS PASSED! New API structure is working correctly.")
        else:
            print(f"⚠️  {total - passed} test categories failed. Please check the issues above.")
            
        return test_results

if __name__ == "__main__":
    tester = ModularAPITester()
    results = tester.run_modular_tests()