# Payments (Paypur) — setup & go-live

1. **Run the migration** `supabase/migrations/20260930090000_payments_referrals.sql` in the Supabase SQL editor (after all earlier ones).
2. **Vercel env:** add `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → `service_role`, *never* prefix with `NEXT_PUBLIC_`). Optional: `PAYMENT_SETTINGS_KEY` (any long random string) to encrypt the saved gateway credentials with a dedicated secret. Redeploy.
3. **Admin → Payments:** paste **Gateway Key** and **Gateway Salt** from the Paypur dashboard, tick *Accept payments*, keep *Test mode* on, Save. Use *Check connection*.
4. **Test purchase:** log in as a student → open a paid course → Checkout. It charges **₹1**. After paying in your UPI app you land on a success page and the course opens under *My courses*. Check *Admin → Orders* (TEST badge, status Paid).
5. **Go live:** untick *Test mode*. Courses are then charged their real prices (edit prices in Admin → Courses).

Notes
- Access is granted only after the server verifies Paypur's signed callback and status. Closing the tab early is fine — the student can press *Check payment status* on the result page.
- Refunds: send money back from the Paypur dashboard, then *Admin → Orders → Refund…* to remove access and cancel any unpaid referral commission.
- Referral payouts are manual: *Admin → Referrals* → pay via UPI/bank → enter the transaction reference.
- Assumptions to confirm with the first real payment: the status strings Paypur returns (`success`, `failed`, …), and that "Gateway Key" is the `X-PAYPUR-KEY` value and "Gateway Salt" is the signing secret. If a real payment stays "pending", check the server log line `[paypur]` and the status field returned by `/api/merchant/status`.
