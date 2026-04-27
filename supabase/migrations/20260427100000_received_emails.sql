-- Table for inbound emails received via Resend webhook
create table if not exists public.received_emails (
    id          bigserial primary key,
    created_at  timestamp with time zone not null default now(),
    from_email  text not null,
    from_name   text,
    to_email    text,
    subject     text,
    text_body   text,
    html_body   text,
    contact_id  integer references public.contacts(id) on delete set null,
    resend_message_id text unique,
    is_read     boolean not null default false
);

-- Indexes for common query patterns
create index if not exists received_emails_contact_id_idx on public.received_emails (contact_id);
create index if not exists received_emails_created_at_idx on public.received_emails (created_at desc);
create index if not exists received_emails_is_read_idx    on public.received_emails (is_read) where is_read = false;

-- RLS
alter table public.received_emails enable row level security;

create policy "authenticated users can manage received emails"
    on public.received_emails
    for all
    using (auth.uid() is not null);
