# Google Drive Integration Architecture & Technical Review

## 1. Technical Review of Current Implementation

### 1.1 Existing Code Review
- **`src/lib/video.ts`:**
  ```ts
  const drive = raw.match(/drive\.google\.com\/file\/d\/([-\w]+)/);
  if (drive) return { kind: "iframe", src: `https://drive.google.com/file/d/${drive[1]}/preview` };
  ```
- **`src/components/learn/video-player.tsx`:**
  - Handles `source.kind === "file"` with native HTML5 `<video>` (full events: `onTimeUpdate`, `onPause`, `onEnded`, timestamp resume).
  - Handles YouTube with `postMessage` event listening.
  - Treats Google Drive as an unmanaged `<iframe>` (`https://drive.google.com/file/d/.../preview`).

### 1.2 Critical Limitations of Current Drive Preview Iframe
1. **Zero Playback Telemetry:**
   - The Drive preview player runs in a sandboxed cross-origin iframe (`drive.google.com`).
   - Browser cross-origin policies prevent the parent application from reading `currentTime`, `duration`, `playbackRate`, or playback state.
   - Consequence: Video progress tracking does **not work** for Drive videos (resuming where left off is impossible, and auto-completing lessons at 90% cannot function).
2. **Note Timestamping Broken:**
   - The note-taking feature (`playerClock.seconds`) relies on the active player reporting current time. With Drive iframes, note timestamps default to `null` or unanchored times.
3. **Severe DRM / Content Protection Vulnerability:**
   - The iframe embedding mechanism requires the underlying Drive video to be accessible to anyone with the link (or shared publicly).
   - Any student (or inspect element / network inspector) can extract the direct Drive file ID, open it in a new tab, download the raw video via Drive's built-in download button, or share the link with non-paying users.
   - Making Google Drive folders public to enable iframe embedding completely bypasses Supabase RLS and payment paywalls.

---

## 2. Recommended Production Architecture: Authorized Streaming Proxy

To achieve full feature parity (native HTML5 video, progress tracking, resume, note timestamping) while keeping course assets completely private, Gradient Code must employ an **Authorized Server-Side Streaming Proxy**:

```mermaid
flowchart TD
    subgraph Client ["Client Browser"]
        A["HTML5 &lt;video&gt; in VideoPlayer.tsx"]
    end

    subgraph AppServer ["Next.js App Server (Serverless / Node.js)"]
        B["/api/video/[lessonId]"]
        C["Supabase Server Auth &amp; Enrollment Check"]
        D["Google Drive Service Client (Server-Only)"]
    end

    subgraph Storage ["Private Google Drive"]
        E["Google Drive API v3 (files.get alt=media)"]
        F["Private Course Video Storage (No Public Link)"]
    end

    A -- "1. GET /api/video/lesson-123 (Range: bytes=0-)" --> B
    B -- "2. Check session &amp; verify enrollment" --> C
    C -- "3. Authorized" --> B
    B -- "4. Fetch file metadata &amp; forward Range request" --> D
    D -- "5. files.get(fileId, alt='media', headers={Range})" --> E
    E --> F
    F -- "6. 206 Partial Content stream" --> E
    E -- "7. Pipe stream chunk" --> D
    D -- "8. Response (206 Partial Content, Content-Range, Content-Type: video/mp4)" --> B
    B --> A
```

---

## 3. Detailed Component Specifications

### 3.1 Authorization Pipeline (`/api/video/[lessonId]`)
1. **Authentication:** Extract authenticated user from Supabase SSR session (`createClient()`).
2. **Access Control Verification:**
   - If lesson has `is_free_preview = true` $\rightarrow$ Allow playback immediately (even for unauthenticated visitors).
   - If user has role `admin` $\rightarrow$ Allow playback immediately.
   - Otherwise $\rightarrow$ Verify active enrollment:
     $$\exists e \in \text{enrollments} \quad \text{where} \quad e.\text{user\_id} = \text{auth.uid()} \land e.\text{course\_id} = \text{lesson.course\_id} \land (e.\text{expires\_at} > \text{now()} \lor e.\text{expires\_at IS NULL})$$
   - If check fails $\rightarrow$ Return `403 Forbidden` (`{"error": "Unauthorized: Enrollment required"}`).

### 3.2 HTTP Range Request & Partial Content Handling
Video players require scrubbing, seeking, and adaptive buffering. The proxy must implement RFC 7233 (HTTP Range Requests):
- **Request Headers:** Inspect incoming `Range: bytes=start-end`.
- **Upstream Forwarding:** Forward the exact `Range` header to the Google Drive API.
- **Response Headers:**
  - Status code: `206 Partial Content` (or `200 OK` if no range requested).
  - `Content-Range: bytes start-end/total`.
  - `Content-Length: chunk_size`.
  - `Content-Type: video/mp4` (or matching mime type).
  - `Accept-Ranges: bytes`.
  - `Cache-Control: private, no-cache, no-store`.

### 3.3 Google Service Account Configuration
- Create a Google Cloud Platform (GCP) project with the Google Drive API enabled.
- Create a Service Account with email `drive-streamer@gradient-code.iam.gserviceaccount.com`.
- Grant the service account read-only access (Viewer) directly to the root Course folders in Google Drive.
- Store credentials strictly in server environment variables:
  ```env
  GOOGLE_SERVICE_ACCOUNT_EMAIL="drive-streamer@gradient-code.iam.gserviceaccount.com"
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
  ```
- **Security Invariant:** Never prefix these credentials with `NEXT_PUBLIC_`. Never bundle them in client code.

---

## 4. Supabase Database Schema Extensions

To decouple video metadata from generic text URLs, extend the `lessons` table with dedicated streaming metadata:

```sql
-- Migration: 20260929120000_drive_video_metadata.sql
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS video_provider TEXT NOT NULL DEFAULT 'html5'
    CHECK (video_provider IN ('html5', 'drive', 'youtube', 'vimeo', 'external')),
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_mime_type TEXT DEFAULT 'video/mp4',
  ADD COLUMN IF NOT EXISTS drive_size BIGINT,
  ADD COLUMN IF NOT EXISTS drive_modified_time TIMESTAMPTZ;

-- Fast index for streaming lookup
CREATE INDEX IF NOT EXISTS idx_lessons_drive_file_id ON public.lessons(drive_file_id) WHERE drive_file_id IS NOT NULL;
```

---

## 5. Security & Operational Rules

1. **No Public Folders:** Never change course Drive folder permissions to "Anyone on the internet with the link can view". The folder must remain restricted to the Service Account email.
2. **Rate Limiting & Quota Management:**
   - Google Drive API has per-user and per-project queries-per-minute quotas.
   - For high scale (10,000+ concurrent students), proxying Drive API directly may hit Google rate limits.
   - **Recommended Scale Roadmap:**
     - *Phase 2–4 (Initial batches / Beta):* Drive API streaming proxy is lightweight, low-overhead, and zero extra hosting cost.
     - *Phase 8+ (Scale):* Automated pipeline that ingests from Drive into an S3-compatible object store (e.g., Cloudflare R2 or Supabase Storage) with HLS encoding and Cloudflare CDN caching for zero egress fees and broadcast-grade streaming.
3. **No Direct `webContentLink` Exposure:** Never output Google Drive `webContentLink` in JSON payloads or HTML attributes.
