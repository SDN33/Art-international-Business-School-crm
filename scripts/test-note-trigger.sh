#!/bin/bash
SUPABASE_URL="${SUPABASE_URL:-https://lmlehskymbrqxqoepuuk.supabase.co}"
API_KEY="${SUPABASE_SERVICE_KEY:?SUPABASE_SERVICE_KEY is required}"

echo "=== Before: contact 65 ==="
curl -s "${SUPABASE_URL}/rest/v1/contacts?select=id,first_name,pipeline_status&id=eq.65" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}"

echo ""
echo "=== Adding qualifying note ==="
curl -s -X POST "${SUPABASE_URL}/rest/v1/contact_notes" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"contact_id": 65, "text": "Bot WA 05/04: Lead interesse par la formation Acteur Leader. Demande d info sur les dates et prix."}'

echo ""
echo "=== After: contact 65 ==="
curl -s "${SUPABASE_URL}/rest/v1/contacts?select=id,first_name,pipeline_status&id=eq.65" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}"

echo ""
echo "=== Checking deal sync ==="
curl -s "${SUPABASE_URL}/rest/v1/deals?select=id,stage&contact_ids=cs.%7B65%7D&limit=3" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}"
