#!/usr/bin/env bash
set -euo pipefail

BNAME="pr-${AWS_PULL_REQUEST_ID}"

BRANCHES=$(curl -sf \
  "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches" \
  -H "Authorization: Bearer ${NEON_API_KEY}")
EXISTING=$(echo "$BRANCHES" | jq -r --arg n "$BNAME" '.branches[] | select(.name==$n) | .id')
[ -n "$EXISTING" ] && curl -sf -X DELETE \
  "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${EXISTING}" \
  -H "Authorization: Bearer ${NEON_API_KEY}"

EXPIRES=$(date -u -d '+7 days' +%Y-%m-%dT%H:%M:%SZ)
RESP=$(curl -sf -X POST \
  "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches" \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg n "$BNAME" --arg e "$EXPIRES" \
    '{branch: {name: $n, expires_at: $e}, endpoints: [{type: "read_write"}]}')")

echo "$RESP" | jq -r '.connection_uris[0].connection_uri' > /tmp/neon-url
