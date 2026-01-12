#!/bin/bash
# Auth API Test Script
# Tests registration, login, verification, and token flows

BASE_URL="${1:-http://localhost:3000}"
echo "🧪 Testing Auth API at $BASE_URL"
echo "═════════════════════════════════════════════════════════════"

# Generate unique test data
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@example.com"
TEST_USERNAME="testuser${TIMESTAMP}"
TEST_PASSWORD="TestPass123"
TEST_NAME="Test User"

echo ""
echo "📝 Test 1: Register new user"
echo "─────────────────────────────────────────────────────────────"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"$TEST_NAME\",
    \"username\": \"$TEST_USERNAME\"
  }")
echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"

echo ""
echo "📝 Test 2: Attempt login without verification (should fail)"
echo "─────────────────────────────────────────────────────────────"
LOGIN_UNVERIFIED=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")
echo "$LOGIN_UNVERIFIED" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_UNVERIFIED"

echo ""
echo "📝 Test 3: Register with duplicate email (should fail)"
echo "─────────────────────────────────────────────────────────────"
DUPLICATE_EMAIL=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"Another User\",
    \"username\": \"anotheruser${TIMESTAMP}\"
  }")
echo "$DUPLICATE_EMAIL" | python3 -m json.tool 2>/dev/null || echo "$DUPLICATE_EMAIL"

echo ""
echo "📝 Test 4: Register with duplicate username (should fail)"
echo "─────────────────────────────────────────────────────────────"
DUPLICATE_USERNAME=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"another${TIMESTAMP}@example.com\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"Another User\",
    \"username\": \"$TEST_USERNAME\"
  }")
echo "$DUPLICATE_USERNAME" | python3 -m json.tool 2>/dev/null || echo "$DUPLICATE_USERNAME"

echo ""
echo "📝 Test 5: Register with invalid password (should fail)"
echo "─────────────────────────────────────────────────────────────"
INVALID_PASSWORD=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"invalid${TIMESTAMP}@example.com\",
    \"password\": \"weak\",
    \"name\": \"Test User\",
    \"username\": \"invaliduser${TIMESTAMP}\"
  }")
echo "$INVALID_PASSWORD" | python3 -m json.tool 2>/dev/null || echo "$INVALID_PASSWORD"

echo ""
echo "📝 Test 6: Register with invalid username (should fail)"
echo "─────────────────────────────────────────────────────────────"
INVALID_USERNAME=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"invalid2${TIMESTAMP}@example.com\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"Test User\",
    \"username\": \"ab\"
  }")
echo "$INVALID_USERNAME" | python3 -m json.tool 2>/dev/null || echo "$INVALID_USERNAME"

echo ""
echo "📝 Test 7: Access /me without token (should fail)"
echo "─────────────────────────────────────────────────────────────"
NO_TOKEN=$(curl -s -X GET "$BASE_URL/api/auth/me")
echo "$NO_TOKEN" | python3 -m json.tool 2>/dev/null || echo "$NO_TOKEN"

echo ""
echo "📝 Test 8: Register with phone number (alternative to email)"
echo "─────────────────────────────────────────────────────────────"
PHONE_USER=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"phone\": \"+1234567890\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"Phone User\",
    \"username\": \"phoneuser${TIMESTAMP}\"
  }")
echo "$PHONE_USER" | python3 -m json.tool 2>/dev/null || echo "$PHONE_USER"

echo ""
echo "📝 Test 9: Login with phone user (no email = no verification needed)"
echo "─────────────────────────────────────────────────────────────"
PHONE_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"phone\": \"+1234567890\",
    \"password\": \"$TEST_PASSWORD\"
  }")
echo "$PHONE_LOGIN" | python3 -m json.tool 2>/dev/null || echo "$PHONE_LOGIN"

# Extract tokens from phone login
ACCESS_TOKEN=$(echo "$PHONE_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
REFRESH_TOKEN=$(echo "$PHONE_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('refreshToken',''))" 2>/dev/null)

if [ -n "$ACCESS_TOKEN" ]; then
  echo ""
  echo "📝 Test 10: Access /me with valid token"
  echo "─────────────────────────────────────────────────────────────"
  ME_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  echo "$ME_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ME_RESPONSE"

  echo ""
  echo "📝 Test 11: Refresh token"
  echo "─────────────────────────────────────────────────────────────"
  REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")
  echo "$REFRESH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REFRESH_RESPONSE"
fi

echo ""
echo "═════════════════════════════════════════════════════════════"
echo "✅ Auth API tests completed!"
echo "═════════════════════════════════════════════════════════════"
