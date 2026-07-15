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
  the top; week and day budgets are prorated from the monthly budget), a
  progress meter, and your recent purchases with a category icon on each.
  Tap × on a row to delete it. "Set budget" in the corner edits your monthly
  budget.
- **Add** (the + tab) — amount, category, optional note, and date.
- **Insights** — stat tiles (total spent, daily average, most spent in a
  day), a per-day spending bar chart with hover tooltips, and a
  spending-by-category breakdown. Filter by last 7 days, 30 days, or this
  month.

## Categories

Food · Transport · Shopping · Fitness · Fun · Bills · Health · Other

## Data

Stored under the `budget.v1` key in localStorage as
`{ monthlyBudget, purchases: [{ id, amount, category, note, date, createdAt }] }`.
Clearing site data resets the app.
