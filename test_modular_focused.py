#!/usr/bin/env python3
"""
Focused Testing for BuildCRM Modular API Routes
Tests the key new modular API endpoints
"""

import requests
import json
import time

# Configuration
BASE_URL = "https://homepro-hub-5.preview.emergentagent.com/api"
SUPER_ADMIN_EMAIL = "admin@buildcrm.com"
SUPER_ADMIN_PASSWORD = "admin123"

def log_test(test_name, success, message=""):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if message:
        print(f"   {message}")
    print()

def make_request(method, endpoint, data=None, token=None):
    """Make HTTP request"""
    url = f"{BASE_URL}{endpoint}"
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
        else:
            return None
        return response
    except Exception as e:
        print(f"Request failed: {e}")
        return None

def main():
    print("🚀 TESTING BUILDCRM MODULAR API - FOCUSED TEST")
    print("=" * 60)
    
    results = {}
    
    # Test 1: Public Endpoints
    print("=== TESTING PUBLIC ENDPOINTS ===")
    
    # Health check
    response = make_request('GET', '/health')
    if response and response.status_code == 200:
        data = response.json()
        if 'status' in data and data['status'] == 'healthy':
            log_test("Health Check", True, f"Status: {data['status']}")
            results['health'] = True
        else:
            log_test("Health Check", False, "Invalid health response")
            results['health'] = False
    else:
        log_test("Health Check", False, "Health endpoint failed")
        results['health'] = False
    
    # Plans
    response = make_request('GET', '/plans')
    if response and response.status_code == 200:
        plans = response.json()
        log_test("Get Plans", True, f"Found {len(plans)} plans")
        results['plans'] = True
    else:
        log_test("Get Plans", False, "Plans endpoint failed")
        results['plans'] = False
    
    # Public modules
    response = make_request('GET', '/modules/public')
    if response and response.status_code == 200:
        modules = response.json()
        log_test("Get Public Modules", True, f"Found {len(modules)} modules")
        results['modules_public'] = True
    else:
        log_test("Get Public Modules", False, "Modules endpoint failed")
        results['modules_public'] = False
    
    # Test 2: Authentication
    print("=== TESTING AUTHENTICATION ===")
    
    # Super admin login
    login_data = {"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
    response = make_request('POST', '/auth/login', login_data)
    
    super_admin_token = None
    if response and response.status_code == 200:
        data = response.json()
        if 'token' in data and data['user']['role'] == 'super_admin':
            super_admin_token = data['token']
            log_test("Super Admin Login", True, f"Logged in as {data['user']['email']}")
            results['super_admin_login'] = True
        else:
            log_test("Super Admin Login", False, "Invalid response structure")
            results['super_admin_login'] = False
    else:
        log_test("Super Admin Login", False, f"Login failed - Status: {response.status_code if response else 'No response'}")
        results['super_admin_login'] = False
    
    # Client registration
    timestamp = int(time.time())
    register_data = {
        "businessName": f"Test Modular Co {timestamp}",
        "email": f"modular{timestamp}@buildcrm.com",
        "password": "testpass123",
        "phone": "+91 9876543210",
        "planId": "basic"
    }
    
    response = make_request('POST', '/auth/register', register_data)
    client_token = None
    client_id = None
    
    if response and response.status_code == 200:
        data = response.json()
        if 'token' in data and 'client' in data:
            client_token = data['token']
            client_id = data['client']['id']
            log_test("Client Registration", True, f"Registered {register_data['businessName']}")
            results['client_registration'] = True
        else:
            log_test("Client Registration", False, "Invalid registration response")
            results['client_registration'] = False
    else:
        log_test("Client Registration", False, f"Registration failed - Status: {response.status_code if response else 'No response'}")
        results['client_registration'] = False
    
    # Test /auth/me
    if client_token:
        response = make_request('GET', '/auth/me', token=client_token)
        if response and response.status_code == 200:
            data = response.json()
            if 'user' in data and 'client' in data:
                log_test("Auth Me Endpoint", True, f"Retrieved user: {data['user']['email']}")
                results['auth_me'] = True
            else:
                log_test("Auth Me Endpoint", False, "Invalid /auth/me response")
                results['auth_me'] = False
        else:
            log_test("Auth Me Endpoint", False, "Failed to get user info")
            results['auth_me'] = False
    
    # Test 3: Super Admin Endpoints
    if super_admin_token:
        print("=== TESTING SUPER ADMIN ENDPOINTS ===")
        
        # Admin stats with charts
        response = make_request('GET', '/admin/stats', token=super_admin_token)
        if response and response.status_code == 200:
            stats = response.json()
            if 'overview' in stats and 'charts' in stats:
                overview = stats['overview']
                charts = stats['charts']
                log_test("Admin Stats with Charts", True, 
                        f"Clients: {overview.get('totalClients')}, Revenue: ₹{overview.get('monthlyRevenue')}, Charts: {len(charts.get('monthlyGrowth', []))} months")
                results['admin_stats'] = True
            else:
                log_test("Admin Stats with Charts", False, "Missing charts or overview data")
                results['admin_stats'] = False
        else:
            log_test("Admin Stats with Charts", False, "Failed to get admin stats")
            results['admin_stats'] = False
        
        # Admin clients
        response = make_request('GET', '/admin/clients', token=super_admin_token)
        if response and response.status_code == 200:
            clients = response.json()
            log_test("Admin Get Clients", True, f"Found {len(clients)} clients")
            results['admin_clients'] = True
        else:
            log_test("Admin Get Clients", False, "Failed to get clients")
            results['admin_clients'] = False
    
    # Test 4: Client Endpoints
    if client_token:
        print("=== TESTING CLIENT ENDPOINTS ===")
        
        # Client stats
        response = make_request('GET', '/client/stats', token=client_token)
        if response and response.status_code == 200:
            stats = response.json()
            if 'totalLeads' in stats and 'totalProjects' in stats:
                log_test("Client Stats", True, f"Leads: {stats['totalLeads']}, Projects: {stats['totalProjects']}")
                results['client_stats'] = True
            else:
                log_test("Client Stats", False, "Missing required fields")
                results['client_stats'] = False
        else:
            log_test("Client Stats", False, "Failed to get client stats")
            results['client_stats'] = False
        
        # Client modules
        response = make_request('GET', '/client/modules', token=client_token)
        if response and response.status_code == 200:
            modules = response.json()
            log_test("Client Modules", True, f"Found {len(modules)} available modules")
            results['client_modules'] = True
        else:
            log_test("Client Modules", False, "Failed to get client modules")
            results['client_modules'] = False
    
    # Test 5: Module Request Workflow
    if client_token and super_admin_token:
        print("=== TESTING MODULE REQUEST WORKFLOW ===")
        
        # Create module request
        request_data = {
            "moduleId": "wooden-flooring",
            "message": "Need wooden flooring module for business"
        }
        
        response = make_request('POST', '/module-requests', request_data, token=client_token)
        request_id = None
        
        if response and response.status_code == 201:
            data = response.json()
            if 'request' in data:
                request_id = data['request']['id']
                log_test("Create Module Request", True, f"Created request: {request_id}")
                results['create_module_request'] = True
            else:
                log_test("Create Module Request", False, "Invalid create response")
                results['create_module_request'] = False
        else:
            log_test("Create Module Request", False, f"Failed to create request - Status: {response.status_code if response else 'No response'}")
            results['create_module_request'] = False
        
        # Get module requests (admin view)
        response = make_request('GET', '/module-requests', token=super_admin_token)
        if response and response.status_code == 200:
            requests_list = response.json()
            log_test("Get Module Requests", True, f"Found {len(requests_list)} requests")
            results['get_module_requests'] = True
        else:
            log_test("Get Module Requests", False, "Failed to get requests")
            results['get_module_requests'] = False
    
    # Test 6: White Label Access Control
    if client_token:
        print("=== TESTING WHITE LABEL ACCESS CONTROL ===")
        
        response = make_request('GET', '/whitelabel', token=client_token)
        if response and response.status_code == 403:
            data = response.json()
            if 'Enterprise' in data.get('message', ''):
                log_test("White Label Access Control", True, "Correctly blocked non-Enterprise client")
                results['whitelabel_access'] = True
            else:
                log_test("White Label Access Control", False, "Wrong error message")
                results['whitelabel_access'] = False
        elif response and response.status_code == 200:
            log_test("White Label Access Control", True, "Client has Enterprise access")
            results['whitelabel_access'] = True
        else:
            log_test("White Label Access Control", False, "Unexpected response")
            results['whitelabel_access'] = False
    
    # Test 7: Webhook Endpoints
    if client_id:
        print("=== TESTING WEBHOOK ENDPOINTS ===")
        
        webhook_data = {
            "clientId": client_id,
            "source": "External API",
            "leadData": {
                "name": "Webhook Test Lead",
                "email": "webhook@test.com",
                "phone": "+91 9999999999",
                "message": "Test webhook integration"
            }
        }
        
        response = make_request('POST', '/webhook/leads', webhook_data)
        if response and response.status_code == 200:
            result = response.json()
            if 'leadId' in result:
                log_test("Webhook Leads", True, f"Lead created: {result['leadId']}")
                results['webhook_leads'] = True
            else:
                log_test("Webhook Leads", False, "Invalid webhook response")
                results['webhook_leads'] = False
        else:
            log_test("Webhook Leads", False, "Webhook failed")
            results['webhook_leads'] = False
    
    # Test 8: Sample CRUD Endpoints
    if client_token:
        print("=== TESTING SAMPLE CRUD ENDPOINTS ===")
        
        # Test leads
        response = make_request('GET', '/leads', token=client_token)
        if response and response.status_code == 200:
            leads = response.json()
            log_test("Leads CRUD", True, f"Found {len(leads)} leads")
            results['leads_crud'] = True
        else:
            log_test("Leads CRUD", False, "Failed to get leads")
            results['leads_crud'] = False
        
        # Test reports
        response = make_request('GET', '/reports/sales', token=client_token)
        if response and response.status_code == 200:
            report = response.json()
            if 'byStatus' in report and 'monthlyData' in report:
                log_test("Sales Report", True, f"Generated report with {len(report['monthlyData'])} months")
                results['sales_report'] = True
            else:
                log_test("Sales Report", False, "Invalid report structure")
                results['sales_report'] = False
        else:
            log_test("Sales Report", False, "Failed to get sales report")
            results['sales_report'] = False
    
    # Summary
    print("=" * 60)
    print("🏁 MODULAR API TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name.replace('_', ' ').title()}")
    
    print(f"\nOverall Result: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed >= total * 0.8:  # 80% pass rate
        print("🎉 MODULAR API STRUCTURE IS WORKING WELL!")
    else:
        print(f"⚠️  Some issues found. {total - passed} tests failed.")
    
    return results

if __name__ == "__main__":
    main()