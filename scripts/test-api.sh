#!/bin/bash
# Helper script to test Google Sheets integration

echo "Testing Google Sheets integration..."
curl -s http://localhost:5000/api/debug/sheet-data | jq .

echo ""
echo "Testing client rules endpoint..."
curl -s http://localhost:5000/api/client-rules | jq .

echo ""
echo "Testing meeting types endpoint..."
curl -s http://localhost:5000/api/meeting-types | jq .

echo ""
echo "Testing timeslots endpoint..."
curl -s http://localhost:5000/api/timeslots | jq .

echo ""
echo "If any of these tests fail, check your Google Sheets configuration."
echo "See README.md and local-setup.md for troubleshooting tips."
