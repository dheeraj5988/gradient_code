-- Legal pages + business details, editable from the admin panel.
-- Pages are public-readable; only admins can write. Seeded with DRAFT templates that must be reviewed by the owner (and ideally a lawyer).

CREATE TABLE IF NOT EXISTS public.site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  company_name TEXT,          -- brand shown to users, e.g. "Gradient Code"
  legal_name TEXT,            -- registered entity name
  support_email TEXT,
  support_phone TEXT,
  address TEXT,
  refund_window_days INTEGER CHECK (refund_window_days IS NULL OR refund_window_days BETWEEN 0 AND 365),
  governing_law TEXT,         -- e.g. "the laws of India; courts at <city>"
  updated_by UUID REFERENCES auth.users ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.site_settings (id, company_name) VALUES (true, 'Gradient Code') ON CONFLICT DO NOTHING;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
DROP POLICY IF EXISTS "site settings readable" ON public.site_settings;
CREATE POLICY "site settings readable" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "admins write site settings" ON public.site_settings;
CREATE POLICY "admins write site settings" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.site_pages (
  slug TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 2 AND 120),
  body_md TEXT NOT NULL DEFAULT '',
  reviewed BOOLEAN NOT NULL DEFAULT false,   -- false = shows a "being finalised" notice to visitors
  updated_by UUID REFERENCES auth.users ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_pages TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_pages TO authenticated;
DROP POLICY IF EXISTS "site pages readable" ON public.site_pages;
CREATE POLICY "site pages readable" ON public.site_pages FOR SELECT USING (true);
DROP POLICY IF EXISTS "admins write site pages" ON public.site_pages;
CREATE POLICY "admins write site pages" ON public.site_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Draft templates. {{placeholders}} are filled from site_settings at render time.
INSERT INTO public.site_pages (slug, title, body_md) VALUES
('terms', 'Terms of use', $md$
These terms govern your use of {{company_name}} ("we", "us"), operated by {{legal_name}}. By creating an account, enrolling in a course or using the site you agree to them.

## 1. Your account
You must provide accurate information and keep your password secure. You are responsible for activity on your account. One account is for one person; do not share your login.

## 2. Courses and access
Buying a course gives you a personal, non-transferable licence to view its content for the access period shown on the course page (lifetime access means for as long as the course is offered on the platform). Course content is our property or that of our instructors.

## 3. What you may not do
- Copy, record, download, redistribute or resell course videos, notes, questions or other materials.
- Share your account or paid access with others.
- Attempt to bypass access controls, scrape the site or interfere with its operation.
- Submit unlawful, abusive or plagiarised content.

We may suspend or close accounts that break these rules, and may remove access without refund where the breach is serious.

## 4. Payments
Prices are shown in Indian rupees. Payments are processed by a third-party payment gateway; we do not store your card or UPI credentials. Access is granted once the gateway confirms your payment to us. See the Refund policy for refunds.

## 5. Certificates and internships
Certificates are issued only when the requirements shown for the course are met and can be verified on our website. Internship opportunities depend on eligibility and selection; applying or completing a course does not guarantee an offer.

## 6. Referral programme
If you take part in the referral programme, commission is earned only on verified, non-refunded purchases made through your link, is subject to a holding period, and may be withheld or reversed for self-referral, abuse or refunded orders.

## 7. Availability and changes
We work to keep the platform available but do not promise uninterrupted service. We may update courses, features or these terms; continued use after a change means you accept it.

## 8. Liability
Courses are for education; we do not promise a specific job or income outcome. To the extent permitted by law, our liability is limited to the amount you paid for the course concerned.

## 9. Governing law
These terms are governed by {{governing_law}}.

## 10. Contact
Questions: {{support_email}}. {{address}}
$md$),
('privacy', 'Privacy policy', $md$
This policy explains what personal data {{company_name}} (operated by {{legal_name}}) collects and how it is used.

## What we collect
- **Account data:** name, email address, and optionally phone number and profile details you add.
- **Learning data:** enrolments, lesson progress, notes, practice attempts, certificates and applications.
- **Payment data:** order amount, status and the gateway's transaction reference. We do not receive or store your card, bank or UPI credentials.
- **Technical data:** basic logs such as IP address and browser type, used for security and reliability.

## How we use it
To run your account and courses, process payments, issue and verify certificates, handle internship applications, provide support, prevent fraud and improve the platform. We do not sell your personal data.

## Who we share it with
Service providers that help us operate: hosting and database (Vercel, Supabase), payment processing (our payment gateway), and email delivery. They may process data only to provide their service. We may disclose data when required by law.

## Certificates
Certificate verification pages show the holder's name, course and issue date to anyone who has the credential ID.

## Retention and your choices
We keep your data while your account is active and as long as needed for legal, accounting and dispute purposes. You can ask us to access, correct or delete your data by writing to {{support_email}}; some records (such as payment records) may need to be retained by law.

## Cookies
We use cookies that are necessary to keep you signed in and to remember a referral link you followed. We do not use advertising cookies.

## Security
Access to data is restricted by role and enforced in the database. No system is perfectly secure; tell us at once if you suspect misuse of your account.

## Children
The platform is intended for people aged 18 and over, or younger learners using it with a parent or guardian's consent.

## Changes and contact
We may update this policy and will change the date below when we do. Contact: {{support_email}}. {{address}}
$md$),
('refund', 'Refund policy', $md$
We want you to be confident buying on {{company_name}}.

## Refund window
You may request a refund within **{{refund_window_days}} days** of purchase, provided you have not completed a substantial part of the course. Requests outside this window, or after substantial use, are considered case by case.

## How to request
Write to {{support_email}} from your registered email with your order details and the reason. We aim to respond within a few working days.

## What happens
- Approved refunds are returned to the original payment method through our payment gateway; timing depends on your bank or UPI provider.
- When a refund is processed, access to that course is removed and any referral commission on the order is cancelled.

## Not refundable
Purchases where content was misused (for example downloaded or shared), accounts closed for breaking the Terms of use, and free courses.

## Failed or duplicate payments
If money was debited but the course did not unlock, first press "Check payment status" on the payment result page. If it still hasn't unlocked, contact {{support_email}} with the transaction reference; unconfirmed or duplicate debits are refunded by the gateway.
$md$)
ON CONFLICT (slug) DO NOTHING;
