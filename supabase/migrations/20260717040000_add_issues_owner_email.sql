-- BUG-11 (PLAN_CORRECTION_BOGUES.md): the "owner email" field captured on the
-- private-property branch of the report form was never persisted — issues
-- had no column for it.
alter table public.issues
  add column if not exists owner_email text;
