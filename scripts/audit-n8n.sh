#!/usr/bin/env bash
set -euo pipefail

API="https://api.supabase.com/v1/projects/lmlehskymbrqxqoepuuk/database/query"
TOKEN="sbp_9cdb03f3d191a92ad2e62bc9151a584cbe4334a7"

echo "=== n8n audit (dernier 3 jours) ==="

echo ""
echo "--- Leads n8n (avec meta_lead_id, depuis 2 avril) ---"
curl -sS -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n '{query: "SELECT count(*) as total FROM public.contacts WHERE origine_lead = '\''Meta Lead Ads'\'' AND meta_lead_id IS NOT NULL AND first_seen >= '\''2026-04-02'\'';"}')" | jq .

echo ""
echo "--- Leads par formation (n8n, depuis 2 avril) ---"
curl -sS -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n '{query: "SELECT formation_souhaitee, formation_slug, count(*) as nb FROM public.contacts WHERE origine_lead = '\''Meta Lead Ads'\'' AND meta_lead_id IS NOT NULL AND first_seen >= '\''2026-04-02'\'' GROUP BY 1, 2 ORDER BY nb DESC;"}')" | jq .

echo ""
echo "--- Vérif champs remplis (n8n, depuis 2 avril) ---"
curl -sS -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n '{query: "SELECT count(*) as total, count(CASE WHEN first_name IS NOT NULL AND first_name != '\'''\'' THEN 1 END) as has_firstname, count(CASE WHEN last_name IS NOT NULL AND last_name != '\'''\'' THEN 1 END) as has_lastname, count(CASE WHEN email_jsonb IS NOT NULL AND email_jsonb != '\''[]'\''::jsonb THEN 1 END) as has_email, count(CASE WHEN phone_jsonb IS NOT NULL AND phone_jsonb != '\''[]'\''::jsonb THEN 1 END) as has_phone, count(CASE WHEN formation_souhaitee IS NOT NULL THEN 1 END) as has_formation, count(CASE WHEN pipeline_status IS NOT NULL THEN 1 END) as has_pipeline FROM public.contacts WHERE origine_lead = '\''Meta Lead Ads'\'' AND meta_lead_id IS NOT NULL AND first_seen >= '\''2026-04-02'\'';"}')" | jq .

echo ""
echo "--- Pipeline status des leads n8n (depuis 2 avril) ---"
curl -sS -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n '{query: "SELECT pipeline_status, count(*) as nb FROM public.contacts WHERE origine_lead = '\''Meta Lead Ads'\'' AND meta_lead_id IS NOT NULL AND first_seen >= '\''2026-04-02'\'' GROUP BY 1 ORDER BY nb DESC;"}')" | jq .

echo ""
echo "--- Deals associés aux leads n8n (depuis 2 avril) ---"
curl -sS -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n '{query: "SELECT count(*) as leads_with_deal FROM public.contacts c WHERE c.origine_lead = '\''Meta Lead Ads'\'' AND c.meta_lead_id IS NOT NULL AND c.first_seen >= '\''2026-04-02'\'' AND EXISTS (SELECT 1 FROM public.deals d WHERE c.id = ANY(d.contact_ids));"}')" | jq .

echo ""
echo "--- Échantillon de 5 leads récents ---"
curl -sS -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n '{query: "SELECT id, first_name, last_name, email_jsonb->0->>'\''email'\'' as email, pipeline_status, formation_souhaitee, utm_campaign, meta_lead_id, first_seen::date FROM public.contacts WHERE origine_lead = '\''Meta Lead Ads'\'' AND meta_lead_id IS NOT NULL ORDER BY first_seen DESC LIMIT 5;"}')" | jq .
