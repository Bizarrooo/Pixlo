-- Expand Premium profile preset slots from five to eight.
-- Drop any existing CHECK constraint on slot_number, regardless of its generated name.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.pixlo_profile_presets'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%slot_number%'
  LOOP
    EXECUTE format('ALTER TABLE public.pixlo_profile_presets DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.pixlo_profile_presets
  ADD CONSTRAINT pixlo_profile_presets_slot_number_check
  CHECK (slot_number BETWEEN 1 AND 8);
