#!/usr/bin/env bash
set -euo pipefail

BNAME="pr-${PR_NUMBER}"

BRANCHES=$(curl -sf \
  "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches" \
  -H "Authorization: Bearer ${NEON_API_KEY}")
BRANCH_ID=$(echo "$BRANCHES" | jq -r --arg n "$BNAME" '.branches[] | select(.name==$n) | .id')

if [ -n "$BRANCH_ID" ]; then
  curl -sf -X DELETE \
    "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${BRANCH_ID}" \
    -H "Authorization: Bearer ${NEON_API_KEY}"
  echo "Deleted Neon branch ${BNAME}"
fi
