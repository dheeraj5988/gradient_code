# Google Drive setup (service account)

Videos and files stay **private** in Google Drive. The server authenticates as a Google **service account**, checks the learner's access in Supabase, then streams the file (`/api/video/[lessonId]`, `/api/resource/[resourceId]`) with HTTP Range support so seeking works.

## 1. Create the service account
1. Google Cloud Console → create/select a project → **APIs & Services → Enable APIs** → enable **Google Drive API**.
2. **IAM & Admin → Service Accounts → Create**. No roles are needed.
3. Open it → **Keys → Add key → JSON**. Download the file. Keep it secret.

## 2. Share the course folders
In Google Drive, share each course folder with the service account's email (e.g. `name@project.iam.gserviceaccount.com`) as **Viewer**. Do **not** make the folders public.

## 3. Environment variables (server-only)
From the JSON key:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=name@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
- Never prefix these with `NEXT_PUBLIC_`. Never commit them.
- In Vercel paste the key exactly as in the JSON (with `\n` sequences) — the app converts them.
- Optional: `GOOGLE_DRIVE_API_KEY` only works for files shared as "anyone with the link" and is not recommended.
- Testing/proxy only: `GOOGLE_DRIVE_API_BASE`, `GOOGLE_OAUTH_TOKEN_URL` override Google's endpoints. Leave unset in production.

The app builds and runs without these; Drive lessons then fall back to Google's preview player and the importer shows *BLOCKED*. **Admin → Settings** shows which mode is active.

## 4. Verify
1. Admin → Settings → "Google Drive streaming: Service account configured".
2. Admin → Import from Drive → scan a shared folder.
3. Open a Drive lesson as an enrolled learner: the native player loads `/api/video/<lessonId>`; seeking issues `206 Partial Content` requests.
4. Log out and open a non-preview lesson URL: `/api/video/...` returns **403**.

## Vercel notes
Streaming runs in Node.js serverless functions. Long videos are streamed in ranges by the browser, so each request is short. Keep videos as H.264 MP4 (`+faststart`) for best compatibility.
