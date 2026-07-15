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

- **Home** — your balance left for the **month / week / day** (switchable at
  the top; week and day budgets are prorated from the budget after your
  savings goal is set aside), a progress meter, a **savings-pace chart**, and
  your recent purchases with a category icon on each. Tap a purchase to edit
  it, or × to delete it. "Settings" in the corner edits your budget, savings
  goal, and cycle start day, and has export/import backup.
- **Savings pace chart** — set a monthly savings goal (e.g. save $200 of an
  $800 budget) and the home chart plots your cumulative spending against an
  even "pace" line to your spending limit. Staying under the line means
  you're on track; the headline projects where your savings land if the
  current rate holds, with % of goal and on-track / behind status.
- **Custom cycle start day** — if you're paid on, say, the 25th, set the
  cycle to start on day 25 (1–28) in Settings. The month view, savings, and
  the "This cycle" insights range all follow your pay cycle instead of the
  calendar month.
- **Add** (the + tab) — amount, category, optional note, and date.
- **Insights** — stat tiles (total spent, daily average, most spent in a
  day), a per-day spending bar chart with hover tooltips, and a
  spending-by-category breakdown. Filter by last 7 days, 30 days, or this
  month.

## Categories

Food · Transport · Shopping · Fitness · Fun · Bills · Health · Other

## Data

Stored under the `budget.v1` key in localStorage as
`{ monthlyBudget, savingsGoal, purchases: [{ id, amount, category, note, date, createdAt }] }`.
Clearing site data resets the app — use Settings → Export backup to save a
JSON copy you can re-import on any device.
