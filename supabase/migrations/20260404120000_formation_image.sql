-- Add image column to formations (same JSONB pattern as intervenants.avatar)
alter table public.formations add column image jsonb;
