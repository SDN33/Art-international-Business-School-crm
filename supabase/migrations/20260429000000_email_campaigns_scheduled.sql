-- Add scheduled_at to email_campaigns for deferred sending
ALTER TABLE public.email_campaigns
    ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone;
