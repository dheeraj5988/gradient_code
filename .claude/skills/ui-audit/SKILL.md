---
name: ui-audit
description: Audit changed UI against Gradient Code design rules (tokens only, no hex, states present, 4 widths, light + dark). Args: optional paths; default = changed .tsx files.
---
Scope: files given as args, else `git diff --name-only main...HEAD` + uncommitted changes, filtered to `src/**/*.tsx`.

Static checks (grep, report file:line):
1. Hex/rgb/hsl colours in components (allowed: opengraph-image.tsx, theme-color in layout.tsx, print CSS).
2. Raw Tailwind palette colours (`bg-blue-600`, `text-gray-500`, `slate-`, `zinc-`…) instead of semantic tokens from `src/app/globals.css`.
3. Gradients/glow/decor: `bg-gradient`, `from-`/`to-`/`via-`, `bg-clip-text`, `blur-`, `drop-shadow`, `animate-` (except `animate-spin`/`animate-pulse` in Skeleton/loading and the motion utilities defined in globals.css), shadows other than `shadow-sm`/`shadow-card`.
4. Radius: `rounded-2xl`+ on cards, `rounded-full` on non-pill/avatar elements.
5. `font-mono` outside real code UI.
6. Hand-rolled buttons/inputs/badges/skeletons where `src/components/ui/*` exists.
7. Data screens: each route folder that fetches data has `loading.tsx` (or Skeleton), an EmptyState path, and `error.tsx` (or ErrorState).
8. `dark:` overrides that hard-code colours instead of relying on tokens.
9. Focus: interactive elements without visible focus (`focus-visible:` ring or ui component).

Visual check (if a dev server can run): use the built-in browser at 390, 768, 1024, 1440 px in light and dark. Check: no horizontal scroll (`document.documentElement.scrollWidth > innerWidth`), readable contrast, focus ring visible via Tab.

Output: table of PASS/FAIL per rule with file:line, then a short fix list. Do not change files unless asked.
