#!/bin/bash
SUPABASE_URL="${SUPABASE_URL:-https://lmlehskymbrqxqoepuuk.supabase.co}"
API_KEY="${SUPABASE_SERVICE_KEY:?SUPABASE_SERVICE_KEY is required}"

# Pick a Nouveau lead contact
echo "=== Before: contact 66 ==="
curl -s "${SUPABASE_URL}/rest/v1/contacts?select=id,first_name,pipeline_status&id=eq.66" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}"

echo ""
echo "=== Adding note: rappeler ==="
curl -s -X POST "${SUPABASE_URL}/rest/v1/contact_notes" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"contact_id": 66, "text": "Bot WA 05/04: Lead pas disponible avant juin. Demande a etre recontactee pour les sessions de septembre."}'

echo ""
echo "=== After: contact 66 (should be A rappeler) ==="
curl -s "${SUPABASE_URL}/rest/v1/contacts?select=id,first_name,pipeline_status&id=eq.66" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}"

echo ""
echo "=== Deal sync check ==="
curl -s "${SUPABASE_URL}/rest/v1/deals?select=id,stage&contact_ids=cs.%7B66%7D&limit=3" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}"

echo ""
echo "=== Revert contact 66 ==="
curl -s -X PATCH "${SUPABASE_URL}/rest/v1/contacts?id=eq.66" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"pipeline_status": "Nouveau lead"}'
echo "Reverted"
