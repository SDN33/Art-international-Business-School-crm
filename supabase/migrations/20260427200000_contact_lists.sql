-- Contact lists: named groups of contacts for campaigns / segmentation
CREATE TABLE IF NOT EXISTS contact_lists (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now()
);

-- Members: link between a list and contacts (unique per pair)
CREATE TABLE IF NOT EXISTS contact_list_members (
  id         bigserial PRIMARY KEY,
  list_id    bigint NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  contact_id bigint NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  added_at   timestamptz DEFAULT now(),
  UNIQUE (list_id, contact_id)
);

-- Allow authenticated users to manage their lists
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_list_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_contact_lists" ON contact_lists
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_contact_list_members" ON contact_list_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
