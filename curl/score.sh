#!/usr/bin/env sh
# Check one signup from the command line.
#   export SIGNUP_API_KEY=sv_live_...
#   sh curl/score.sh
curl -sS -X POST "${SIGNUPVET_URL:-https://www.signupvet.com}/score" \
  -H "Authorization: Bearer $SIGNUP_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 2 \
  -d '{
    "email": "jane.doe@gmail.com",
    "phone": "+41 79 123 45 67",
    "ip": "178.197.224.1",
    "context": { "timezone": "Europe/Zurich" }
  }'
echo
