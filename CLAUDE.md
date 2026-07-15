# Budget — project notes for Claude

A personal budgeting app for a single user (the repo owner). Plain
HTML/CSS/JS, zero dependencies, all data in localStorage. See README.md for
the feature overview.

## Workflow (owner's standing preferences)

- **Always merge PRs for the owner.** After building and verifying a change:
  commit, push the branch, create the PR, and merge it immediately — do not
  wait to be asked. (Requested by the owner on 2026-07-15.)
- **Always deploy after merging.** The live app is GitHub Pages serving the
  `gh-pages` branch (https://chrismartin123.github.io/budget/), installed on
  the owner's phone. After merging to `main`, fast-forward `gh-pages` to
  `main` and push it so the phone app picks up the change. (Explicitly
  approved by the owner on 2026-07-15.)
- When app assets change, bump the `CACHE` version in `sw.js` so installed
  copies refresh their offline cache.

## Verifying changes

Chromium is available at `/opt/pw-browsers/chromium`; drive the app with
Playwright (serve the repo folder over localhost HTTP, seed localStorage key
`budget.v1` via `addInitScript`) and check flows end-to-end before pushing.

## Design

Minimalist black-and-white only — no color anywhere. Both light and dark
themes via CSS custom properties on `:root` and `prefers-color-scheme`.
Mobile-first at ~390px width. Charts are hand-built SVG: single-series
grayscale marks, hover tooltips, user text inserted via `textContent` only.
