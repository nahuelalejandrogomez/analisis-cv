#!/bin/bash

# Test script for Railway deployment
# Usage: ./test-railway-login.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="https://analisis-cv-production.up.railway.app"

echo "=========================================="
echo "  Railway Deployment Test Script"
echo "=========================================="
echo ""

# Ask for admin credentials
read -p "Enter ADMIN_EMAIL [admin@redb.ee]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@redb.ee}

read -sp "Enter ADMIN_PASSWORD: " ADMIN_PASSWORD
echo ""
echo ""

# Test 1: Health check
echo -e "${YELLOW}[Test 1]${NC} Health check..."
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Health check passed"
  echo "  Response: $HEALTH_RESPONSE"
else
  echo -e "${RED}✗${NC} Health check failed"
  exit 1
fi
echo ""

# Test 2: Login
echo -e "${YELLOW}[Test 2]${NC} Testing login..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓${NC} Login successful (200 OK)"
  TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "  Token: ${TOKEN:0:50}..."
  
  USER=$(echo "$BODY" | grep -o '"user":{[^}]*}')
  echo "  User: $USER"
else
  echo -e "${RED}✗${NC} Login failed (HTTP $HTTP_CODE)"
  echo "  Response: $BODY"
  exit 1
fi
echo ""

# Test 3: Get current user
echo -e "${YELLOW}[Test 3]${NC} Testing /api/auth/me..."
ME_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

ME_HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
ME_BODY=$(echo "$ME_RESPONSE" | head -n -1)

if [ "$ME_HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓${NC} /me successful (200 OK)"
  echo "  Response: $ME_BODY"
else
  echo -e "${RED}✗${NC} /me failed (HTTP $ME_HTTP_CODE)"
  echo "  Response: $ME_BODY"
  exit 1
fi
echo ""

echo "=========================================="
echo -e "${GREEN}All tests passed!${NC}"
echo "=========================================="
echo ""
echo "You can now use this token for authenticated requests:"
echo "$TOKEN"
echo ""
