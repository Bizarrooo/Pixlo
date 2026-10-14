-- Track the Premium gift award independently from a later revocation.
ALTER TABLE public.pixlo_premium_gifts
  ADD COLUMN IF NOT EXISTS award_announced_at timestamptz;

-- Preserve existing completed-gift announcement state during the transition.
UPDATE public.pixlo_premium_gifts
SET award_announced_at = announced_at
WHERE status = 'completed'
  AND announced_at IS NOT NULL
  AND award_announced_at IS NULL;

COMMENT ON COLUMN public.pixlo_premium_gifts.award_announced_at IS
  'Timestamp when the Premium gift award announcement was sent or verified in Discord; independent of revocation announcement state.';
