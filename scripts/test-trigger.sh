#!/bin/bash
# Test the auto_advance_pipeline_status trigger
SUPABASE_URL="${SUPABASE_URL:-https://lmlehskymbrqxqoepuuk.supabase.co}"
API_KEY="${SUPABASE_SERVICE_KEY:?SUPABASE_SERVICE_KEY is required}"

echo "=== Finding a Nouveau lead contact ==="
CONTACT=$(curl -s "${SUPABASE_URL}/rest/v1/contacts?select=id,first_name,last_name,pipeline_status,reponse_relance_wa&pipeline_status=eq.Nouveau%20lead&reponse_relance_wa=is.null&limit=1" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}")
echo "Before: $CONTACT"

CONTACT_ID=$(echo "$CONTACT" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['id'])")
echo "Testing with contact ID: $CONTACT_ID"

echo ""
echo "=== Setting reponse_relance_wa=true (simulating OpenClaw) ==="
RESULT=$(curl -s -X PATCH "${SUPABASE_URL}/rest/v1/contacts?id=eq.${CONTACT_ID}" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"reponse_relance_wa": true}')
echo "After: $RESULT" | python3 -c "import json,sys; line=sys.stdin.read(); data=json.loads(line.replace('After: ','')); d=data[0]; print(f'  pipeline_status: {d[\"pipeline_status\"]}'); print(f'  reponse_relance_wa: {d[\"reponse_relance_wa\"]}')"

echo ""
echo "=== Checking deal sync ==="
DEAL=$(curl -s "${SUPABASE_URL}/rest/v1/deals?select=id,stage&contact_ids=cs.{${CONTACT_ID}}&limit=1" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}")
echo "Deal: $DEAL"

echo ""
echo "=== Reverting test contact ==="
curl -s -X PATCH "${SUPABASE_URL}/rest/v1/contacts?id=eq.${CONTACT_ID}" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"reponse_relance_wa": null, "pipeline_status": "Nouveau lead"}'
echo "Reverted contact $CONTACT_ID to Nouveau lead"
