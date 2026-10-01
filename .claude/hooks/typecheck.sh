#!/bin/bash
# Runs typecheck after TS/TSX edits; prints at most 15 error lines.
grep -qE '"file_path"\s*:\s*"[^"]*\.tsx?"' <(cat) || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
out=$(npx tsc --noEmit --pretty false 2>&1) && exit 0
echo "typecheck failed ($(echo "$out" | grep -c 'error TS') errors):" >&2
echo "$out" | grep 'error TS' | head -15 >&2
exit 2
