-- BUG-14 (PLAN_CORRECTION_BOGUES.md): "Est-ce votre propriété ?" was captured
-- in the create/edit form but never persisted, so re-opening a "private
-- property, not the reporter's" issue for editing always defaulted back to
-- the "owner" branch, hiding the owner email field.
alter table public.issues
  add column if not exists is_own_property boolean;
