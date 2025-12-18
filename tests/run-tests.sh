#!/bin/bash

# Test Runner Script
# Usage: ./tests/run-tests.sh [unit|integration|all]

set -e

echo "======================================"
echo "BuildCRM Test Suite"
echo "======================================"
echo ""

TEST_TYPE=${1:-all}
FAILED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

run_unit_tests() {
    echo "Running Unit Tests..."
    echo "====================="
    
    # State machine tests
    echo ""
    echo "State Machine Tests:"
    node --experimental-vm-modules tests/unit/state-machines.test.js || FAILED=1
    
    # Validation tests
    echo ""
    echo "Validation Tests:"
    node --experimental-vm-modules tests/unit/validation.test.js || FAILED=1
}

run_integration_tests() {
    echo "Running Integration Tests..."
    echo "============================"
    
    # API tests would go here
    echo "API tests: Not yet implemented"
    
    # Database tests
    echo "Database tests: Not yet implemented"
}

run_e2e_tests() {
    echo "Running E2E Tests..."
    echo "===================="
    
    # Playwright tests would go here
    echo "E2E tests: Not yet implemented"
}

case $TEST_TYPE in
    unit)
        run_unit_tests
        ;;
    integration)
        run_integration_tests
        ;;
    e2e)
        run_e2e_tests
        ;;
    all)
        run_unit_tests
        run_integration_tests
        ;;
    *)
        echo "Usage: $0 [unit|integration|e2e|all]"
        exit 1
        ;;
esac

echo ""
echo "======================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
echo "======================================"
