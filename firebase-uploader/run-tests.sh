#!/bin/bash

# Run all tests for firebase-uploader modules
# Usage: ./run-tests.sh

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║  Firebase Admin Tools - Test Suite                ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running fetchFixtures tests...${NC}"
echo ""

node tests/testFetchFixtures.js

TEST_EXIT_CODE=$?

echo ""
echo "╔════════════════════════════════════════════════════╗"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "║  ${GREEN}✓ All tests passed!${NC}"
else
    echo -e "║  ✗ Some tests failed (exit code: $TEST_EXIT_CODE)"
fi
echo "╚════════════════════════════════════════════════════╝"
echo ""

exit $TEST_EXIT_CODE
