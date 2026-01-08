#!/bin/bash

# TravelWise Backend - Quick Test Script

echo "Testing TravelWise Backend API"
echo "=================================="
echo ""

BASE_URL="http://localhost:3000"

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/health" | jq '.'
echo ""

# Test 2: Get warnings
echo "2. Testing warnings endpoint..."
curl -s "$BASE_URL/api/warnings?country=Lebanon" | jq '.warnings | length'
echo " warnings found"
echo ""

# Test 3: Get locations
echo "3. Testing locations endpoint..."
curl -s "$BASE_URL/api/locations?city=Beirut" | jq '.count'
echo " locations found in Beirut"
echo ""

# Test 4: Generate itinerary
echo "4. Testing itinerary generation..."
curl -s -X POST "$BASE_URL/api/itinerary/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "Lebanon",
    "city": "Beirut",
    "numberOfDays": 3,
    "budgetLevel": "MEDIUM",
    "travelStyle": "MIXED"
  }' | jq '{
    city: .city.name,
    days: .days | length,
    totalLocations: [.days[].locations | length] | add,
    warnings: .warnings | length
  }'

echo ""
echo "Tests completed!"
