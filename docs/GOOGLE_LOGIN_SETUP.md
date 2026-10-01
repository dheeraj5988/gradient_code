# Google login + email sign-up — make it live

The code is already in place:
- **Continue with Google** on `/login` and `/signup` calls Supabase OAuth.
- Google returns to Supabase. Supabase redirects to **`/auth/callback`**, which exchanges the code for a session (cookie) and sends the user to `next`.
- Email sign-up and login use Supabase email/password. New passwords need 8+ characters with an uppercase letter, a lowercase letter and a number.

You only need to configure **Google Cloud**, **Supabase** and **Vercel**. Values for this project:

| Thing | Value |
|---|---|
| Live site | `https://gradientcode.vercel.app` |
| Supabase project ref | `czejfthqrnwjfflbqfqm` |
| Supabase OAuth callback (goes into Google) | `https://czejfthqrnwjfflbqfqm.supabase.co/auth/v1/callback` |
| App callback (goes into Supabase) | `https://gradientcode.vercel.app/auth/callback` |

---

## 1. Google Cloud: create the OAuth client
1. Go to https://console.cloud.google.com and select (or create) a project, e.g. *Gradient Code*.
2. **APIs & Services → OAuth consent screen**:
   - User type **External** → Create.
   - App name *Gradient Code*, your support email, developer contact email.
   - App domain (optional for testing): home page `https://gradientcode.vercel.app`, privacy `…/privacy`, terms `…/terms`.
   - Scopes: keep the defaults (`email`, `profile`, `openid`). Nothing else is needed.
   - **Publishing status:** while it is *Testing*, only the **Test users** you add can log in. Click **Publish app** to let everyone log in. Basic scopes don't need Google verification.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type **Web application**, name *Gradient Code web*.
   - **Authorized JavaScript origins:** `https://gradientcode.vercel.app` and `http://localhost:3000`
   - **Authorized redirect URIs:** `https://czejfthqrnwjfflbqfqm.supabase.co/auth/v1/callback`
     (this is Supabase's URL, **not** your site's. A wrong value here causes `redirect_uri_mismatch`).
   - Create, then copy the **Client ID** and **Client secret**. Never commit them.

## 2. Supabase: enable Google and set URLs
1. **Authentication → Sign In / Providers → Google** → Enable → paste the Client ID and Client secret → Save.
2. **Authentication → URL Configuration**:
   - **Site URL:** `https://gradientcode.vercel.app`
   - **Redirect URLs:** add `https://gradientcode.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`
     (`https://gradientcode.vercel.app/**` also works if you want any path).
3. **Authentication → Sign In / Providers → Email**:
   - **Confirm email:** OFF for the current testing phase (sign-up logs the user straight in).
   - **Password requirements** (Auth → Policies / Password settings): minimum length **8**, requirement **"Lowercase, uppercase letters and digits"**. This makes Supabase reject weak passwords even if someone bypasses the website form.

## 3. Vercel
1. **Settings → Environment Variables (Production):**
   - `NEXT_PUBLIC_SITE_URL = https://gradientcode.vercel.app`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (already set).
   - Google keys are **not** needed in Vercel; they live in Supabase.
2. **Settings → Deployment Protection:** keep it off for the production domain, otherwise visitors hit a Vercel login.
3. Redeploy after changing any variable.

## 4. Test (incognito window)
1. `https://gradientcode.vercel.app/signup` → **Continue with Google** → pick an account → you land on `/dashboard`.
2. Log out (dashboard → **Log out**) → `/login` → **Continue with Google** → back on `/dashboard`.
3. Email sign-up: `Abcdefg1` passes; `abcdefgh` is refused with a clear message.
4. Supabase → Authentication → Users shows the user with provider **google** (or **email**).

## Troubleshooting
| Symptom | Fix |
|---|---|
| `Error 400: redirect_uri_mismatch` | Google redirect URI must be exactly `https://czejfthqrnwjfflbqfqm.supabase.co/auth/v1/callback`. |
| `Access blocked: app has not completed verification` / only some accounts work | The consent screen is in *Testing*: add test users or **Publish app**. |
| Back on `/login` with "Google sign-in did not complete" | The code exchange failed: check that the Redirect URLs in Supabase include `https://gradientcode.vercel.app/auth/callback`, then retry in a fresh tab (codes are single-use). |
| Redirected to `localhost:3000` after Google | Supabase **Site URL** is still localhost: set it to `https://gradientcode.vercel.app`. |
| "Unsupported provider: provider is not enabled" | Google isn't enabled in Supabase → step 2.1. |
| Vercel login page instead of the site | You opened the `…-projects.vercel.app` preview URL. Use `gradientcode.vercel.app` or turn off Deployment Protection for Production. |

Admins: a Google account becomes admin like any other: add a row in `user_roles` (`role = 'admin'`) for that user's id.
