-- Payments are Paypur-only. Drop the unused Lovable-era Razorpay columns from orders.
-- Paypur references live in the columns added by 20260930090000_payments_referrals.sql.
-- Irreversible: any values stored in these columns by the old app are discarded.
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS razorpay_order_id,
  DROP COLUMN IF EXISTS razorpay_payment_id;
