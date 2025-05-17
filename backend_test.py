
import requests
import sys
import json
from datetime import datetime

class OptraAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {json.dumps(response_data, indent=2)[:500]}...")
                except:
                    print(f"Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}...")
            
            self.test_results.append({
                "name": name,
                "success": success,
                "status_code": response.status_code,
                "expected_status": expected_status
            })
            
            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )

    def test_logs(self):
        """Test logs endpoint"""
        return self.run_test(
            "Get Logs",
            "GET",
            "logs",
            200
        )
    
    def test_market_quote(self, ticker="AAPL"):
        """Test market quote endpoint"""
        return self.run_test(
            f"Market Quote for {ticker}",
            "GET",
            f"market/quote/{ticker}",
            200
        )
    
    def test_market_history(self, ticker="AAPL"):
        """Test market history endpoint"""
        return self.run_test(
            f"Market History for {ticker}",
            "GET",
            f"market/history/{ticker}",
            200,
            params={"period": "1mo", "interval": "1d"}
        )
    
    def test_market_search(self, query="AAPL"):
        """Test market search endpoint"""
        return self.run_test(
            f"Market Search for {query}",
            "GET",
            f"market/search/{query}",
            200
        )
    
    def test_layouts(self):
        """Test layouts endpoints"""
        # Test GET layouts
        success, layouts = self.run_test(
            "Get Layouts",
            "GET",
            "layouts",
            200
        )
        
        # Test POST layout
        test_layout = {
            "name": f"Test Layout {datetime.now().strftime('%H%M%S')}",
            "description": "Created by automated test",
            "layout": {
                "windows": [
                    {
                        "title": "Test Window",
                        "module": "marketData",
                        "position": {"x": 100, "y": 100},
                        "size": {"width": 800, "height": 600}
                    }
                ]
            }
        }
        
        success, created_layout = self.run_test(
            "Create Layout",
            "POST",
            "layouts",
            200,
            data=test_layout
        )
        
        if success and created_layout and "id" in created_layout:
            # Test GET specific layout
            layout_id = created_layout["id"]
            self.run_test(
                f"Get Layout {layout_id}",
                "GET",
                f"layouts/{layout_id}",
                200
            )
            
            # Test DELETE layout
            self.run_test(
                f"Delete Layout {layout_id}",
                "DELETE",
                f"layouts/{layout_id}",
                200
            )
        
        return success

def main():
    # Get backend URL from environment or use default
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                backend_url = line.strip().split('=')[1]
                break
    
    print(f"Using backend URL: {backend_url}")
    tester = OptraAPITester(backend_url)
    
    # Run tests
    tester.test_health()
    tester.test_logs()
    tester.test_market_quote("AAPL")
    tester.test_market_quote("MSFT")
    tester.test_market_history("AAPL")
    tester.test_market_search("TECH")
    tester.test_layouts()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    # Print summary of failed tests
    failed_tests = [test for test in tester.test_results if not test["success"]]
    if failed_tests:
        print("\n❌ Failed tests:")
        for test in failed_tests:
            print(f"  - {test['name']}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
