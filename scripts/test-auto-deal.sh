#!/usr/bin/env bash
set -euo pipefail

API="https://api.supabase.com/v1/projects/lmlehskymbrqxqoepuuk/database/query"
TOKEN="sbp_9cdb03f3d191a92ad2e62bc9151a584cbe4334a7"

echo "=== Insert test contact ==="
RESULT=$(curl -sS -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "INSERT INTO public.contacts (first_name, last_name, pipeline_status, status, formation_souhaitee, origine_lead, first_seen, last_seen) VALUES ('"'"'Test'"'"', '"'"'AutoDeal'"'"', '"'"'Nouveau lead'"'"', '"'"'lead'"'"', '"'"'Acteur Leader'"'"', '"'"'Meta Lead Ads'"'"', now(), now()) RETURNING id, first_name, last_name, pipeline_status;"}')
echo "$RESULT" | jq .

CONTACT_ID=$(echo "$RESULT" | jq -r '.[0].id')
echo ""
echo "Contact ID: $CONTACT_ID"

echo ""
echo "=== Check auto-created deal ==="
curl -sS -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "SELECT id, name, stage, formation_souhaitee, contact_ids FROM public.deals WHERE ${CONTACT_ID} = ANY(contact_ids);" '{query: $q}')" | jq .

echo ""
echo "=== Cleanup: delete deal and contact ==="
curl -sS -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "DELETE FROM public.deals WHERE ${CONTACT_ID} = ANY(contact_ids); DELETE FROM public.contacts WHERE id = ${CONTACT_ID};" '{query: $q}')"
echo "✅ Cleanup done"
