---
name: phase-check
description: Run typecheck + build and print a pass/fail report plus the AGENTS.md final-report template. Use before committing a phase.
---
1. Run `npm run typecheck`. If errors only reference `.next/types` for deleted routes, run `rm -rf .next/types` and re-run once (say so).
2. Run `npm run build`. Capture the exit code; keep only error/warning lines.
3. Run `git status -s` and `git diff --stat main...HEAD` (plus uncommitted changes) to list changed files.
   Derive changed routes from paths under `src/app/**` (page.tsx / route.ts → URL). List new files in `supabase/migrations/`.
4. Print exactly:

   ## Phase check
   - Typecheck: PASS | FAIL (n errors; first 5 lines)
   - Build: PASS | FAIL (first error)
   ## Final report
   - **Files changed:** …
   - **Routes changed:** …
   - **What to test:** concrete steps, incl. 390/768/1024/1440 px in light + dark
   - **SQL the owner must run:** new migration filenames in order, or "none"
   - **Not verified:** anything needing real Supabase / Paypur / Google Drive credentials

Never report PASS for a step you did not run. Do not commit.
