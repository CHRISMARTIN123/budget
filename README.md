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
  the top; week and day budgets are prorated from the monthly budget after
  your savings goal is set aside), a progress meter, and your recent
  purchases with a category icon on each. Tap a purchase to edit it, or × to
  delete it. "Settings" in the corner edits your monthly budget and savings
  goal, and has export/import backup.
- **Savings** — set a monthly savings goal (e.g. save $200 of an $800
  budget). Savings accrue day by day: everything you don't spend from the
  prorated budget counts toward the goal, so an under-budget day adds to
  savings and an over-budget day eats into them. The card shows the amount
  saved so far, % of goal, and whether you're on pace.
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
