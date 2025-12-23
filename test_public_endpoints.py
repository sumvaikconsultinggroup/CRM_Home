#!/usr/bin/env python3
"""
Quick test for public endpoints to verify they're working
"""

import requests
import time

BASE_URL = "https://floor-fixer.preview.emergentagent.com/api"

def test_public_endpoints():
    print("Testing public endpoints...")
    
    # Test multiple times to check consistency
    for i in range(3):
        print(f"\nTest run {i+1}:")
        
        # Test plans endpoint
        try:
            response = requests.get(f"{BASE_URL}/plans", timeout=10)
            if response.status_code == 200:
                plans = response.json()
                print(f"✅ Plans endpoint: {len(plans)} plans found")
            else:
                print(f"❌ Plans endpoint failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Plans endpoint error: {e}")
            
        # Test modules endpoint
        try:
            response = requests.get(f"{BASE_URL}/modules/public", timeout=10)
            if response.status_code == 200:
                modules = response.json()
                print(f"✅ Modules endpoint: {len(modules)} modules found")
            else:
                print(f"❌ Modules endpoint failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Modules endpoint error: {e}")
            
        time.sleep(1)  # Small delay between tests

if __name__ == "__main__":
    test_public_endpoints()