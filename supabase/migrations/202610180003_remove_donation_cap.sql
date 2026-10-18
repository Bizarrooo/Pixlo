-- Remove Pixlo's old £1,000 per-donation cap.
-- Keep donations within Stripe's eight-digit GBP-pence amount range (£999,999.99).

alter table public.pixlo_donations
  drop constraint if exists pixlo_donations_amount_pence_check;

alter table public.pixlo_donations
  drop constraint if exists pixlo_donations_amount_pence_supported_range;

alter table public.pixlo_donations
  add constraint pixlo_donations_amount_pence_supported_range
  check (amount_pence >= 100 and amount_pence <= 99999999);

notify pgrst, 'reload schema';
