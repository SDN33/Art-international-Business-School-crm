drop view if exists public.contacts_summary;
create or replace view public.contacts_summary with (security_invoker = on) as
select
    co.id,
    co.first_name,
    co.last_name,
    co.gender,
    co.title,
    co.background,
    co.avatar,
    co.first_seen,
    co.last_seen,
    co.has_newsletter,
    co.status,
    co.tags,
    co.company_id,
    co.sales_id,
    co.linkedin_url,
    co.email_jsonb,
    co.phone_jsonb,
    co.pipeline_status,
    co.origine_lead,
    co.formation_souhaitee,
    co.formation_slug,
    co.utm_source,
    co.utm_medium,
    co.utm_campaign,
    co.calendly_reserved,
    co.qualification_bot,
    co.reponse_relance_email,
    co.reponse_relance_wa,
    co.indice_no_show,
    co.lien_calendly,
    co.valeur_estimee,
    co.converted_at,
    (jsonb_path_query_array(co.email_jsonb, '$[*]."email"'))::text as email_fts,
    (jsonb_path_query_array(co.phone_jsonb, '$[*]."number"'))::text as phone_fts,
    c.name as company_name,
    count(distinct t.id) filter (where t.done_date is null) as nb_tasks
from public.contacts co
    left join public.tasks t on co.id = t.contact_id
    left join public.companies c on co.company_id = c.id
group by co.id, c.name;
