# Budget

A minimal, black-and-white personal budgeting app. No accounts, no server, no
dependencies — everything lives in your browser's localStorage.

## Run it

Open `index.html` in a browser, or serve the folder:

```sh
npx serve .
# or
python3 -m http.server 8000
```

It's mobile-first, so it looks best at phone width (or add it to your home
screen). Dark mode follows your system setting.

## What it does

- **Home** — your balance left for the **month / week / day** (switchable;
  prorated from the budget after your savings goal is set aside), a
  "safe to spend today" line, the savings-pace chart, and recent purchases.
  Tap a purchase to edit it, × to delete.
- **History** — every purchase, grouped by day with day totals, plus search
  and category filter chips.
- **Add** (the + tab) — amount, category, note, date, and an optional
  **"Repeats monthly"** toggle for rent, subscriptions, and gym fees: the
  purchase is re-added automatically on that day each month.
- **Insights** — stat tiles with **vs-previous-period deltas**, a per-day
  spending chart, **category budgets** (spent vs the limits you set, with
  over-limit flags), spending by category, and a **six-cycle monthly trend**.
  Filter by 7 days, 30 days, or this cycle.
- **Daily rollover** — choose what happens to an under-spent day: **Into
  savings** keeps a flat daily allowance and the leftover builds your savings;
  **Into next days** shares the leftover across the days remaining in the
  cycle, raising what you can spend later (and lowering it after an
  over-spend). Home's "safe to spend today" reflects the choice.
- **Settings** — monthly budget, savings goal, cycle start day (align to
  payday), daily rollover mode, **per-category spending limits**,
  repeating-purchase management, and your data: JSON backup export/import,
  **CSV export**, and erase.
- **Bank CSV import** (Settings → Bank transactions) — download a
  transaction-history CSV from your bank (built against DBS digibank exports;
  tolerant of similar debit/credit or single-amount formats) and import it.
  Everything is parsed locally in the browser, deposits are skipped, merchants
  are auto-categorized (editable), rows you've imported before are excluded,
  and possible duplicates of hand-logged purchases start unticked — nothing is
  added until you confirm the review list.

## Design

Monochrome, "made not generated" — a stat-led layout where the balance is the
hero figure, set in **Fraunces** (display serif) over **Geist** (grotesk body),
with tabular figures, hairline dividers, and full interactive states. Fonts are
self-hosted in `fonts/` and cached by the service worker for offline use. The
visual system was built with the vendored [Hallmark](https://github.com/Nutlope/hallmark)
anti-AI-slop design skill (`.claude/skills/hallmark/`, MIT) — a future Claude
Code session on this repo can run `hallmark audit .` or `hallmark redesign .`.

## Categories

Food · Transport · Shopping · Fitness · Fun · Bills · Health · Other

## Data

Stored under the `budget.v1` key in localStorage as
`{ monthlyBudget, savingsGoal, purchases: [{ id, amount, category, note, date, createdAt }] }`.
Clearing site data resets the app — use Settings → Export backup to save a
JSON copy you can re-import on any device.
