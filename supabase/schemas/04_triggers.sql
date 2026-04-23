--
-- Triggers
-- This file declares all triggers.
--

-- Auto-populate sales_id from current auth user on insert
create or replace trigger set_company_sales_id_trigger
    before insert on public.companies
    for each row execute function public.set_sales_id_default();

create or replace trigger set_contact_sales_id_trigger
    before insert on public.contacts
    for each row execute function public.set_sales_id_default();

create or replace trigger set_contact_notes_sales_id_trigger
    before insert on public.contact_notes
    for each row execute function public.set_sales_id_default();

create or replace trigger set_deal_sales_id_trigger
    before insert on public.deals
    for each row execute function public.set_sales_id_default();

create or replace trigger set_deal_notes_sales_id_trigger
    before insert on public.deal_notes
    for each row execute function public.set_sales_id_default();

create or replace trigger set_task_sales_id_trigger
    before insert on public.tasks
    for each row execute function public.set_sales_id_default();

-- Auto-fetch company logo from website favicon on save
create or replace trigger company_saved
    before insert or update on public.companies
    for each row execute function public.handle_company_saved();

-- Auto-fetch contact avatar from email on save
create or replace trigger contact_saved
    before insert or update on public.contacts
    for each row execute function public.handle_contact_saved();

-- Update contact.last_seen when a contact note is created
create or replace trigger on_public_contact_notes_created_or_updated
    after insert on public.contact_notes
    for each row execute function public.handle_contact_note_created_or_updated();

-- Cleanup storage attachments when contact notes are updated or deleted
create or replace trigger on_contact_notes_attachments_updated_delete_note_attachments
    after update on public.contact_notes
    for each row
    when (old.attachments is distinct from new.attachments)
    execute function public.cleanup_note_attachments();

create or replace trigger on_contact_notes_deleted_delete_note_attachments
    after delete on public.contact_notes
    for each row execute function public.cleanup_note_attachments();

-- Cleanup storage attachments when deal notes are updated or deleted
create or replace trigger on_deal_notes_attachments_updated_delete_note_attachments
    after update on public.deal_notes
    for each row
    when (old.attachments is distinct from new.attachments)
    execute function public.cleanup_note_attachments();

create or replace trigger on_deal_notes_deleted_delete_note_attachments
    after delete on public.deal_notes
    for each row execute function public.cleanup_note_attachments();

-- Auth triggers: sync auth.users to public.sales
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

create or replace trigger on_auth_user_updated
    after update on auth.users
    for each row execute function public.handle_update_user();

-- Auto-update updated_at on contacts
create or replace trigger set_contacts_updated_at
    before update on public.contacts
    for each row execute function public.update_contacts_updated_at();

-- Auto-advance pipeline_status when bot fields change (e.g. reponse_relance_wa)
-- Also syncs the corresponding deal stage
create or replace trigger auto_advance_pipeline_status_trigger
    before update on public.contacts
    for each row
    when (
        old.reponse_relance_wa is distinct from new.reponse_relance_wa
        or old.pipeline_status is distinct from new.pipeline_status
    )
    execute function public.auto_advance_pipeline_status();

-- Auto-advance pipeline_status based on note content keywords
create or replace trigger auto_pipeline_from_note_trigger
    after insert on public.contact_notes
    for each row
    execute function public.auto_pipeline_from_note();

-- Auto-create a deal when a new contact is inserted (only if it has a name).
create or replace trigger auto_create_deal_on_contact_trigger
    after insert on public.contacts
    for each row
    execute function public.auto_create_deal_on_contact();

-- Auto-create a deal when a contact gains a name for the first time and has no deal yet.
create or replace trigger auto_create_deal_on_contact_update_trigger
    after update of first_name, last_name on public.contacts
    for each row
    execute function public.auto_create_deal_on_contact_update();

create or replace trigger set_documents_sales_id_trigger
    before insert on public.documents
    for each row execute function public.set_sales_id_default();
