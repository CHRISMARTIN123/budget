"use strict";

/* ============ Categories ============ */
const CATEGORIES = [
  { id: "food",          label: "Food",          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v7a2 2 0 0 0 2 2h0V3M9 12v9M7 6h4"/><path d="M16 3c-1.5 1-2 3-2 5s.5 4 2 4v9"/></svg>' },
  { id: "transport",     label: "Transport",     icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16 6.5 8.5A2 2 0 0 1 8.5 7h7a2 2 0 0 1 2 2.5L16.9 16"/><rect x="4" y="16" width="16" height="3" rx="1"/><path d="M7 19v1.5M17 19v1.5"/></svg>' },
  { id: "shopping",      label: "Shopping",      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12a1.5 1.5 0 0 1-1.5 1.4h-7A1.5 1.5 0 0 1 7 20L6 8Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>' },
  { id: "fitness",       label: "Fitness",       icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M4 9v6M20 9v6M6.5 12h11"/></svg>' },
  { id: "entertainment", label: "Fun",           icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M8 5v4M16 5v4"/></svg>' },
  { id: "bills",         label: "Bills",         icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z"/><path d="M9 8h6M9 12h6"/></svg>' },
  { id: "health",        label: "Health",        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/></svg>' },
  { id: "other",         label: "Other",         icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/></svg>' },
];
const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

/* ============ Storage ============ */
const STORE_KEY = "budget.v1";

// Anything read from localStorage or an imported backup is untrusted: a
// hand-edited or corrupted file must never crash the app (a recurring rule
// with a bad `lastPosted` used to break boot) or poison the math with
// negative/Infinity amounts. Sanitize on every entry point.
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
function validAmount(n) { return typeof n === "number" && Number.isFinite(n) && n > 0; }
function cents(n) { return Math.round(n * 100) / 100; }

function sanitizePurchases(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((p) => p && validAmount(p.amount) && typeof p.date === "string" && DATE_KEY_RE.test(p.date))
    .map((p) => {
      const out = {
        id: typeof p.id === "string" ? p.id : uid(),
        amount: cents(p.amount),
        category: catById(p.category).id,
        note: typeof p.note === "string" ? p.note.slice(0, 60) : "",
        date: p.date,
        createdAt: typeof p.createdAt === "number" ? p.createdAt : Date.now(),
      };
      if (p.recurringId != null) out.recurringId = String(p.recurringId);
      return out;
    });
}
function sanitizeRecurring(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => r && validAmount(r.amount)
      && typeof r.lastPosted === "string" && DATE_KEY_RE.test(r.lastPosted)
      && Number.isInteger(r.day) && r.day >= 1 && r.day <= 31)
    .map((r) => ({
      id: typeof r.id === "string" ? r.id : uid(),
      amount: cents(r.amount),
      category: catById(r.category).id,
      note: typeof r.note === "string" ? r.note.slice(0, 60) : "",
      day: r.day,
      lastPosted: r.lastPosted,
    }));
}
function sanitizeLimits(obj) {
  const out = {};
  if (obj && typeof obj === "object") {
    for (const c of CATEGORIES) if (validAmount(obj[c.id])) out[c.id] = cents(obj[c.id]);
  }
  return out;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.purchases)) {
        if (!validAmount(data.monthlyBudget)) data.monthlyBudget = null;
        if (typeof data.savingsGoal !== "number" || !Number.isFinite(data.savingsGoal) || data.savingsGoal < 0) data.savingsGoal = 0;
        if (typeof data.cycleStartDay !== "number") data.cycleStartDay = 1;
        if (data.rolloverMode !== "spread" && data.rolloverMode !== "save") data.rolloverMode = "save";
        data.categoryBudgets = sanitizeLimits(data.categoryBudgets);
        data.recurring = sanitizeRecurring(data.recurring);
        data.purchases = sanitizePurchases(data.purchases);
        return data;
      }
    }
  } catch (_) { /* corrupted store — start fresh */ }
  return { monthlyBudget: null, savingsGoal: 0, cycleStartDay: 1, categoryBudgets: {}, recurring: [], rolloverMode: "save", purchases: [] };
}
function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (_) {
    alert("Couldn't save — your browser storage may be full. Export a backup from Settings to be safe.");
  }
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const store = loadStore();
saveStore(); // persist the sanitized shape so a corrupted store is healed on disk, not just in memory
const state = { period: "month", range: "7", view: "home", selectedCat: "food", editingId: null, histCat: "all", histQuery: "" };

/* ============ Date helpers (all local time) ============ */
const DAY_MS = 86400000;

function todayKey() { return dateKey(new Date()); }
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function startOfWeek(d) { // Monday
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - dow);
  return out;
}
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

// The budget "cycle" is a month-length window starting on cycleStartDay (1–28),
// so someone paid on the 25th can align it to their pay date.
function cycleStartDay() {
  const n = Math.round(store.cycleStartDay || 1);
  return Math.min(28, Math.max(1, n));
}
function cycleRange(ref) {
  const day = cycleStartDay();
  let y = ref.getFullYear(), m = ref.getMonth();
  if (ref.getDate() < day) m -= 1; // before this month's start → previous cycle
  return { start: new Date(y, m, day), end: new Date(y, m + 1, day) };
}
function cycleLenDays(c) { return Math.round((c.end - c.start) / DAY_MS); }
function midnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

/* ============ Money ============ */
const fmtWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
function money(n, forceCents) {
  const useCents = forceCents || Math.abs(n % 1) > 0.004;
  return (useCents ? fmtCents : fmtWhole).format(n);
}

/* ============ Recurring purchases ============ */
// A rule posts a copy of its purchase on the same day each month (clamped to
// month length). Due occurrences are back-filled on every app open.
function nextDueKey(rule) {
  const last = parseKey(rule.lastPosted);
  const y = last.getFullYear(), m = last.getMonth() + 1;
  const day = Math.min(rule.day, daysInMonth(new Date(y, m, 1)));
  return dateKey(new Date(y, m, day));
}
function processRecurring() {
  const today = todayKey();
  let changed = false;
  for (const rule of store.recurring) {
    let guard = 0;
    while (guard++ < 36) {
      const due = nextDueKey(rule);
      if (due > today) break;
      store.purchases.push({
        id: uid(), amount: rule.amount, category: rule.category, note: rule.note,
        date: due, createdAt: Date.now(), recurringId: rule.id,
      });
      rule.lastPosted = due;
      changed = true;
    }
  }
  if (changed) saveStore();
}

/* ============ Aggregation ============ */
function spentBetween(from, to) { // [from, to) as Date, date-key comparison
  const a = dateKey(from), b = dateKey(to);
  let sum = 0;
  for (const p of store.purchases) if (p.date >= a && p.date < b) sum += p.amount;
  return sum;
}
function spentByCategoryBetween(from, to) {
  const a = dateKey(from), b = dateKey(to);
  const map = new Map();
  for (const p of store.purchases) if (p.date >= a && p.date < b) map.set(p.category, (map.get(p.category) || 0) + p.amount);
  return map;
}

// what's available to spend this cycle after the savings goal is set aside
function spendableAmount() {
  return store.monthlyBudget == null ? null : Math.max(0, store.monthlyBudget - (store.savingsGoal || 0));
}

// Today's spendable allowance.
//  - "save" mode: a flat budget ÷ cycle-length. Whatever you don't spend
//    stays unspent and builds toward your savings.
//  - "spread" mode: whatever is left this cycle ÷ the days that remain, so an
//    under-spent day lifts the allowance on the days that follow (and an
//    over-spent day lowers it).
function dailyAllowanceToday() {
  const spendable = spendableAmount();
  if (spendable == null) return null;
  const now = new Date();
  const today = midnight(now);
  const cycle = cycleRange(now);
  if (store.rolloverMode === "spread") {
    const spentBeforeToday = spentBetween(cycle.start, today);
    const daysRemaining = Math.max(1, Math.round((cycle.end - today) / DAY_MS));
    return Math.max(0, (spendable - spentBeforeToday) / daysRemaining);
  }
  return spendable / cycleLenDays(cycle);
}

function periodInfo() {
  const now = new Date();
  const today = midnight(now);
  const cycle = cycleRange(now);
  const cLen = cycleLenDays(cycle);
  const spendable = spendableAmount();
  const flatDaily = spendable == null ? null : spendable / cLen;
  const todayAllowance = dailyAllowanceToday();

  if (state.period === "month") {
    const label = cycleStartDay() === 1 ? "Left this month" : "Left this cycle";
    return {
      label, budget: spendable, spent: spentBetween(cycle.start, cycle.end),
      daysLeft: Math.round((cycle.end - today) / DAY_MS), todayAllowance, todayFlat: flatDaily,
    };
  }
  if (state.period === "week") {
    const from = startOfWeek(now);
    const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
    return {
      label: "Left this week", budget: flatDaily == null ? null : flatDaily * 7,
      spent: spentBetween(from, to), daysLeft: Math.round((to - today) / DAY_MS),
      todayAllowance, todayFlat: flatDaily,
    };
  }
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return { label: "Left today", budget: todayAllowance, spent: spentBetween(today, to), daysLeft: 0, todayAllowance, todayFlat: flatDaily };
}

/* ============ Home ============ */
const $ = (sel) => document.querySelector(sel);

// Stat-led reveal: tick the hero figure from 0 to target (~480ms), whole
// dollars during flight, exact value on the final frame. Reduced-motion safe.
// A single rAF handle is tracked so a new render (e.g. switching period) can
// cancel any in-flight tick — otherwise the old animation overwrites the new
// value and the balance looks stuck on the previous period.
let heroAnim = null;
function stopHeroAnim() {
  if (heroAnim != null) { cancelAnimationFrame(heroAnim); heroAnim = null; }
}
function animateCount(el, to) {
  stopHeroAnim();
  if (!Number.isFinite(to) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = money(to);
    return;
  }
  const dur = 480, t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    if (p < 1) { el.textContent = money(Math.round(to * eased)); heroAnim = requestAnimationFrame(step); }
    else { el.textContent = money(to); heroAnim = null; }
  };
  heroAnim = requestAnimationFrame(step);
}

function renderHome(animate) {
  const info = periodInfo();
  $("#hero-label").textContent = info.label;

  const heroValue = $("#hero-value");
  const heroSub = $("#hero-sub");
  const meterFill = $("#meter-fill");
  const heroToday = $("#hero-today");
  let heroTarget;

  if (info.budget == null) {
    heroTarget = -info.spent || 0;
    heroSub.textContent = "Set a monthly budget in Settings to track what's left.";
    meterFill.style.width = "0%";
    heroToday.hidden = true;
  } else {
    const left = info.budget - info.spent;
    heroTarget = left;
    const parts = [`of ${money(info.budget)}`];
    if (state.period === "month" && (store.savingsGoal || 0) > 0) parts.push(`saving ${money(store.savingsGoal)}`);
    if (state.period !== "day") parts.push(`${info.daysLeft} day${info.daysLeft === 1 ? "" : "s"} left`);
    if (state.period === "day" && store.rolloverMode === "spread" && info.todayFlat != null) {
      const rolled = info.todayAllowance - info.todayFlat;
      if (rolled >= 0.01) parts.push(`+${money(rolled, true)} rolled in`);
      else if (rolled <= -0.01) parts.push(`${money(rolled, true)} rolled out`);
    }
    if (left < 0) parts.push("over budget");
    heroSub.textContent = parts.join(" · ");
    const pct = info.budget > 0 ? Math.min(100, (info.spent / info.budget) * 100) : 100;
    meterFill.style.width = pct.toFixed(1) + "%";

    // safe-to-spend today (PocketGuard-style), on month/week views
    if (state.period !== "day" && info.todayAllowance != null) {
      const today = midnight(new Date());
      const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const todayLeft = info.todayAllowance - spentBetween(today, tomorrow);
      const rollNote = store.rolloverMode === "spread" ? " (rolling)" : "";
      heroToday.hidden = false;
      heroToday.textContent = todayLeft >= 0
        ? `Safe to spend today${rollNote} · ${money(todayLeft, true)}`
        : `${money(-todayLeft, true)} over today's pace`;
    } else {
      heroToday.hidden = true;
    }
  }

  if (animate) {
    animateCount(heroValue, heroTarget);
  } else {
    stopHeroAnim(); // a non-animated render (period switch) must win over any in-flight tick
    heroValue.textContent = money(heroTarget);
  }

  renderCycleCard();
  renderRecent();
}

/* ============ Cycle card + home chart ============ */
// Cumulative spending across the current cycle, drawn against an even "pace"
// line to the spending limit. Staying under the pace line means you're on
// track to hit your savings goal; the headline projects where savings land if
// the current spending rate holds.
function renderCycleCard() {
  const card = $("#cycle-card");
  if (store.monthlyBudget == null) { card.hidden = true; return; }
  card.hidden = false;

  const goal = store.savingsGoal || 0;
  const budget = store.monthlyBudget;
  const spendable = Math.max(0, budget - goal);

  const now = new Date();
  const today = midnight(now);
  const cycle = cycleRange(now);
  const cLen = cycleLenDays(cycle);
  const elapsed = Math.min(cLen, Math.max(1, Math.round((today - cycle.start) / DAY_MS) + 1));

  // per-day and cumulative spend for the cycle
  const dayTotals = new Array(cLen).fill(0);
  for (const p of store.purchases) {
    const idx = Math.round((parseKey(p.date) - cycle.start) / DAY_MS);
    if (idx >= 0 && idx < cLen) dayTotals[idx] += p.amount;
  }
  const cum = [0];
  for (let i = 0; i < cLen; i++) cum.push(cum[i] + dayTotals[i]);
  const spent = cum[elapsed];

  const frac = elapsed / cLen;
  const projectedSpend = spent / frac;
  const projectedSavings = budget - projectedSpend;
  const onTrack = spent <= spendable * frac + 0.001;

  const valueEl = $("#cycle-value");
  const valueLabel = $("#cycle-value-label");
  const sub = $("#cycle-sub");
  const title = $("#cycle-title");

  if (goal > 0) {
    title.textContent = "Savings pace";
    valueEl.textContent = money(Math.round(projectedSavings));
    valueLabel.textContent = "projected savings";
    if (projectedSavings < 0) {
      sub.textContent = `Projected to overspend by ${money(-projectedSavings)} — cut back to save.`;
    } else {
      const pct = Math.round((projectedSavings / goal) * 100);
      sub.textContent = `${pct}% of your ${money(goal)} goal · ${onTrack ? "on track" : "behind pace"}`;
    }
  } else {
    title.textContent = cycleStartDay() === 1 ? "This month" : "This cycle";
    valueEl.textContent = money(spent, true);
    valueLabel.textContent = "spent so far";
    sub.textContent = `${money(spent)} of ${money(spendable)} · ${onTrack ? "on track" : "over pace"}`;
  }

  renderHomeChart({ cycle, cLen, elapsed, cum, spendable, budget });
}

function renderHomeChart({ cycle, cLen, elapsed, cum, spendable, budget }) {
  const wrap = $("#home-chart");
  wrap.textContent = "";

  const W = 400, H = 150;
  const pad = { top: 14, right: 12, bottom: 20, left: 40 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  const maxCum = Math.max(...cum.slice(0, elapsed + 1), 0);
  const yTop = niceMax(Math.max(spendable, budget, maxCum));
  const X = (i) => pad.left + (iw * i) / cLen;
  const Y = (v) => pad.top + ih - (ih * v) / yTop;

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Cumulative spending against savings pace this cycle" });

  // y ticks: 0 and top
  for (const t of [0, 1]) {
    const y = pad.top + ih - ih * t;
    svg.append(svgEl("line", { x1: pad.left, x2: W - pad.right, y1: y, y2: y, class: "chart-grid" }));
    const tick = svgEl("text", { x: pad.left - 7, y: y + 3.5, "text-anchor": "end", class: "chart-tick" });
    tick.textContent = "$" + Math.round(yTop * t).toLocaleString("en-US");
    svg.append(tick);
  }

  // pace line: even spending that lands exactly on the limit at cycle end
  svg.append(svgEl("line", { x1: X(0), y1: Y(0), x2: X(cLen), y2: Y(spendable), class: "chart-ref" }));
  const paceLbl = svgEl("text", { x: X(cLen), y: Y(spendable) - 5, "text-anchor": "end", class: "chart-reflabel" });
  paceLbl.textContent = "limit " + money(spendable);
  svg.append(paceLbl);

  // cumulative spend area + line up to today
  const pts = [];
  for (let i = 0; i <= elapsed; i++) pts.push([X(i), Y(cum[i])]);
  const lineD = pts.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" ");
  const areaD = `M${X(0)},${Y(0)} ` + pts.map((p) => `L${p[0]},${p[1]}`).join(" ") + ` L${X(elapsed)},${Y(0)} Z`;
  svg.append(svgEl("path", { d: areaD, class: "chart-area" }));
  svg.append(svgEl("path", { d: lineD, class: "chart-line" }));
  svg.append(svgEl("circle", { cx: X(elapsed), cy: Y(cum[elapsed]), r: 4, class: "chart-dot" }));

  // x labels: cycle start and end dates
  const startLbl = svgEl("text", { x: X(0), y: H - 6, "text-anchor": "start", class: "chart-tick" });
  startLbl.textContent = cycle.start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endDate = new Date(cycle.end.getFullYear(), cycle.end.getMonth(), cycle.end.getDate() - 1);
  const endLbl = svgEl("text", { x: X(cLen), y: H - 6, "text-anchor": "end", class: "chart-tick" });
  endLbl.textContent = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  svg.append(startLbl, endLbl);

  // per-day hit targets: tooltip with date, spent-to-date, and pace target
  for (let i = 1; i <= elapsed; i++) {
    const bandX = X(i) - iw / cLen / 2;
    const hit = svgEl("rect", { x: bandX, y: pad.top, width: iw / cLen, height: ih, class: "chart-hit", tabindex: "0" });
    const dayDate = new Date(cycle.start.getFullYear(), cycle.start.getMonth(), cycle.start.getDate() + i - 1);
    const paceTarget = spendable * (i / cLen);
    const show = (ev) => showTooltip(
      money(cum[i], true),
      `${dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · pace ${money(paceTarget)}`,
      ev
    );
    hit.addEventListener("pointermove", show);
    hit.addEventListener("pointerleave", hideTooltip);
    hit.addEventListener("focus", () => show({ target: hit }));
    hit.addEventListener("blur", hideTooltip);
    svg.append(hit);
  }

  wrap.append(svg);
}

/* ============ Purchase rows (shared by Home + History) ============ */
function friendlyDate(key) {
  const t = todayKey();
  if (key === t) return "Today";
  if (key === dateKey(new Date(Date.now() - DAY_MS))) return "Yesterday";
  return parseKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function purchaseRow(p, { showDate }) {
  const cat = catById(p.category);
  const li = document.createElement("li");
  li.className = "txn";

  const icon = document.createElement("span");
  icon.className = "txn-icon";
  icon.innerHTML = cat.icon; // static app-defined SVG, never user input

  const main = document.createElement("div");
  main.className = "txn-main";
  const title = document.createElement("p");
  title.className = "txn-title";
  title.textContent = (p.note || cat.label) + (p.recurringId ? " ↻" : "");
  const meta = document.createElement("p");
  meta.className = "txn-meta";
  meta.textContent = showDate ? `${cat.label} · ${friendlyDate(p.date)}` : cat.label;
  main.append(title, meta);
  main.addEventListener("click", () => startEdit(p));

  const amount = document.createElement("span");
  amount.className = "txn-amount";
  amount.textContent = money(p.amount, true);

  const del = document.createElement("button");
  del.className = "txn-del";
  del.type = "button";
  del.textContent = "×";
  del.setAttribute("aria-label", "Delete purchase");
  del.addEventListener("click", () => {
    if (!confirm(`Delete ${money(p.amount, true)} (${p.note || cat.label})?`)) return;
    store.purchases = store.purchases.filter((x) => x.id !== p.id);
    saveStore();
    renderAll();
  });

  li.append(icon, main, amount, del);
  return li;
}

function sortedPurchases() {
  return [...store.purchases].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function renderRecent() {
  const list = $("#recent-list");
  list.textContent = "";
  const items = sortedPurchases().slice(0, 8);

  $("#recent-empty").hidden = items.length > 0;
  $("#btn-view-all").hidden = store.purchases.length <= 8;

  for (const p of items) list.append(purchaseRow(p, { showDate: true }));
}

/* ============ History ============ */
function renderHistChips() {
  const wrap = $("#hist-chips");
  wrap.textContent = "";
  const mk = (id, label) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (state.histCat === id ? " is-active" : "");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(state.histCat === id));
    b.textContent = label;
    b.addEventListener("click", () => { state.histCat = id; renderHistory(); });
    return b;
  };
  wrap.append(mk("all", "All"));
  for (const c of CATEGORIES) wrap.append(mk(c.id, c.label));
}

function renderHistory() {
  renderHistChips();
  const groupsEl = $("#hist-groups");
  groupsEl.textContent = "";

  const q = state.histQuery.trim().toLowerCase();
  const items = sortedPurchases().filter((p) => {
    if (state.histCat !== "all" && p.category !== state.histCat) return false;
    if (!q) return true;
    const cat = catById(p.category);
    return (p.note || "").toLowerCase().includes(q) || cat.label.toLowerCase().includes(q);
  });

  const total = items.reduce((s, p) => s + p.amount, 0);
  $("#hist-summary").textContent = items.length
    ? `${items.length} purchase${items.length === 1 ? "" : "s"} · ${money(total)}`
    : "";
  $("#hist-empty").hidden = items.length > 0;

  // group by date (day totals precomputed in one pass — items can be hundreds long)
  const dayTotals = new Map();
  for (const p of items) dayTotals.set(p.date, (dayTotals.get(p.date) || 0) + p.amount);

  let currentKey = null, ul = null;
  const CAP = 300;
  for (const p of items.slice(0, CAP)) {
    if (p.date !== currentKey) {
      currentKey = p.date;
      const head = document.createElement("div");
      head.className = "hist-head";
      const label = document.createElement("span");
      label.textContent = friendlyDate(p.date) + " · " + parseKey(p.date).toLocaleDateString("en-US", { weekday: "short" });
      const dayTotal = document.createElement("span");
      dayTotal.className = "hist-head-total";
      dayTotal.textContent = money(dayTotals.get(p.date), true);
      head.append(label, dayTotal);
      ul = document.createElement("ul");
      ul.className = "txn-list";
      groupsEl.append(head, ul);
    }
    ul.append(purchaseRow(p, { showDate: false }));
  }
  if (items.length > CAP) {
    const note = document.createElement("p");
    note.className = "empty small";
    note.textContent = `Showing the first ${CAP} — narrow the search to see older ones.`;
    groupsEl.append(note);
  }
}

/* ============ Add ============ */
function renderCatGrid() {
  const grid = $("#cat-grid");
  grid.textContent = "";
  for (const cat of CATEGORIES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cat-btn" + (cat.id === state.selectedCat ? " is-active" : "");
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", String(cat.id === state.selectedCat));
    btn.innerHTML = cat.icon;
    const label = document.createElement("span");
    label.textContent = cat.label;
    btn.append(label);
    btn.addEventListener("click", () => {
      state.selectedCat = cat.id;
      renderCatGrid();
    });
    grid.append(btn);
  }
}

function parseAmount(raw) {
  const n = parseFloat(String(raw).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

// Inline field errors: visible text linked to the input with aria-describedby
// and aria-invalid so screen readers announce them, not just sighted users.
function setFieldError(input, errEl, msg) {
  if (msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", errEl.id);
  } else {
    errEl.hidden = true;
    errEl.textContent = "";
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  }
}

function resetAddForm() {
  state.editingId = null;
  $("#add-form").reset();
  $("#in-date").value = todayKey();
  $("#add-title").textContent = "Add purchase";
  $("#btn-save-purchase").textContent = "Save purchase";
  $("#repeat-row").hidden = false;
}

function startEdit(p) {
  state.editingId = p.id;
  state.selectedCat = p.category;
  renderCatGrid();
  $("#in-amount").value = p.amount.toFixed(2);
  $("#in-note").value = p.note || "";
  $("#in-date").value = p.date;
  $("#in-repeat").checked = false;
  $("#repeat-row").hidden = true; // repeat is set when creating, managed in Settings after
  $("#add-title").textContent = "Edit purchase";
  $("#btn-save-purchase").textContent = "Save changes";
  switchView("add");
}

function setupAddForm() {
  const form = $("#add-form");
  $("#in-date").value = todayKey();
  $("#in-amount").addEventListener("input", () => setFieldError($("#in-amount"), $("#amount-error"), null));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = parseAmount($("#in-amount").value);
    if (amount == null) {
      setFieldError($("#in-amount"), $("#amount-error"), "Enter an amount greater than zero.");
      $("#in-amount").focus();
      return;
    }
    setFieldError($("#in-amount"), $("#amount-error"), null);
    const date = $("#in-date").value || todayKey();
    const note = $("#in-note").value.trim();

    const editing = state.editingId && store.purchases.find((p) => p.id === state.editingId);
    if (editing) {
      Object.assign(editing, { amount, category: state.selectedCat, note, date });
    } else {
      const purchase = {
        id: uid(), amount, category: state.selectedCat, note, date, createdAt: Date.now(),
      };
      if ($("#in-repeat").checked) {
        const rule = {
          id: uid(), amount, category: state.selectedCat, note,
          day: parseKey(date).getDate(), lastPosted: date,
        };
        store.recurring.push(rule);
        purchase.recurringId = rule.id;
      }
      store.purchases.push(purchase);
    }
    saveStore();
    resetAddForm();
    renderAll();
    switchView("home");
  });
}

/* ============ Insights ============ */
function rangeInfo() {
  const now = new Date();
  const today = midnight(now);
  if (state.range === "month") {
    const from = cycleRange(now).start;
    return { from, days: Math.round((today - from) / DAY_MS) + 1 };
  }
  const days = Number(state.range);
  return { from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1), days };
}

// "▲ 12% vs prev" — compares a total against the window of equal length
// immediately before the current one.
function deltaText(current, previous) {
  if (previous <= 0) return current > 0 ? "no spend in prev. period" : "";
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return "same as prev. period";
  return `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs prev.`;
}

function renderInsights() {
  const { from, days } = rangeInfo();

  // per-day totals across the range
  const perDay = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    perDay.push({ key: dateKey(d), date: d, total: 0 });
  }
  const dayIndex = new Map(perDay.map((d, i) => [d.key, i]));
  const perCat = new Map();
  let total = 0;

  for (const p of store.purchases) {
    const i = dayIndex.get(p.date);
    if (i === undefined) continue;
    perDay[i].total += p.amount;
    perCat.set(p.category, (perCat.get(p.category) || 0) + p.amount);
    total += p.amount;
  }

  // previous window of equal length, for the deltas
  const prevFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate() - days);
  const prevTotal = spentBetween(prevFrom, from);

  // stat tiles
  $("#stat-total").textContent = money(total);
  $("#stat-total-delta").textContent = deltaText(total, prevTotal);
  $("#stat-avg").textContent = money(days > 0 ? total / days : 0);
  $("#stat-avg-delta").textContent = deltaText(days > 0 ? total / days : 0, days > 0 ? prevTotal / days : 0);
  const max = perDay.reduce((a, b) => (b.total > a.total ? b : a), perDay[0] || { total: 0 });
  $("#stat-max").textContent = money(max ? max.total : 0);
  $("#stat-max-day").textContent = max && max.total > 0
    ? max.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "";

  $("#insights-empty").hidden = total > 0;
  renderDailyChart(perDay);
  renderCatBudgets();
  renderCatChart(perCat, total);
  renderTrendChart();
}

/* --- category budgets vs limits (always current cycle) --- */
function renderCatBudgets() {
  const card = $("#catbudget-card");
  const wrap = $("#catbudget-chart");
  const limits = CATEGORIES.filter((c) => (store.categoryBudgets[c.id] || 0) > 0);
  if (limits.length === 0) { card.hidden = true; return; }
  card.hidden = false;
  wrap.textContent = "";

  const cycle = cycleRange(new Date());
  const spentMap = spentByCategoryBetween(cycle.start, cycle.end);

  for (const cat of limits) {
    const limit = store.categoryBudgets[cat.id];
    const spent = spentMap.get(cat.id) || 0;
    const over = spent > limit;

    const row = document.createElement("div");
    row.className = "cat-row" + (over ? " is-over" : "");

    const icon = document.createElement("span");
    icon.className = "cat-row-icon";
    icon.innerHTML = cat.icon;

    const main = document.createElement("div");
    main.className = "cat-row-main";
    const top = document.createElement("div");
    top.className = "cat-row-top";
    const label = document.createElement("span");
    label.className = "cat-row-label";
    label.textContent = cat.label;
    const value = document.createElement("span");
    value.className = "cat-row-value";
    value.textContent = over
      ? `${money(spent)} of ${money(limit)} · ${money(spent - limit)} over`
      : `${money(spent)} of ${money(limit)}`;
    top.append(label, value);

    const track = document.createElement("div");
    track.className = "cat-row-track";
    const fill = document.createElement("div");
    fill.className = "cat-row-fill";
    fill.style.width = Math.min(100, (limit > 0 ? (spent / limit) * 100 : 0)).toFixed(1) + "%";
    track.append(fill);

    main.append(top, track);
    row.append(icon, main);
    wrap.append(row);
  }
}

/* --- monthly trend: totals for the last six cycles --- */
function renderTrendChart() {
  const wrap = $("#trend-chart");
  wrap.textContent = "";

  const cycles = [];
  let ref = new Date();
  for (let k = 0; k < 6; k++) {
    const c = cycleRange(ref);
    cycles.unshift({ ...c, total: spentBetween(c.start, c.end) });
    ref = new Date(c.start.getFullYear(), c.start.getMonth(), c.start.getDate() - 1);
  }

  const W = 400, H = 150;
  const pad = { top: 22, right: 6, bottom: 22, left: 38 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;
  const maxVal = niceMax(Math.max(...cycles.map((c) => c.total), 0));

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Total spent per cycle, last six cycles" });
  for (const t of [0, 0.5, 1]) {
    const y = pad.top + ih - ih * t;
    svg.append(svgEl("line", { x1: pad.left, x2: W - pad.right, y1: y, y2: y, class: "chart-grid" }));
    const tick = svgEl("text", { x: pad.left - 7, y: y + 3.5, "text-anchor": "end", class: "chart-tick" });
    tick.textContent = "$" + Math.round(maxVal * t).toLocaleString("en-US");
    svg.append(tick);
  }

  const band = iw / cycles.length;
  const colW = Math.min(24, band * 0.5);
  const maxCycle = cycles.reduce((a, b) => (b.total > a.total ? b : a), cycles[0]);

  cycles.forEach((c, i) => {
    const cx = pad.left + band * i + band / 2;
    const h = maxVal > 0 ? (c.total / maxVal) * ih : 0;
    const y = pad.top + ih - h;
    const isCurrent = i === cycles.length - 1;

    if (c.total > 0) {
      svg.append(svgEl("path", { d: columnPath(cx - colW / 2, y, colW, h, 4), class: "chart-col" + (isCurrent ? "" : " is-dim") }));
      if (c === maxCycle) {
        const lbl = svgEl("text", { x: cx, y: y - 6, "text-anchor": "middle", class: "chart-toplabel" });
        lbl.textContent = money(c.total);
        svg.append(lbl);
      }
    }
    const xl = svgEl("text", { x: cx, y: H - 6, "text-anchor": "middle", class: "chart-tick" });
    xl.textContent = c.start.toLocaleDateString("en-US", { month: "short" });
    svg.append(xl);

    const hit = svgEl("rect", { x: pad.left + band * i, y: pad.top, width: band, height: ih, class: "chart-hit", tabindex: "0" });
    const label = `${c.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(c.end - DAY_MS).toLocaleDateString("en-US", { month: "short", day: "numeric" })}${isCurrent ? " · so far" : ""}`;
    const show = (ev) => showTooltip(money(c.total, true), label, ev);
    hit.addEventListener("pointermove", show);
    hit.addEventListener("pointerleave", hideTooltip);
    hit.addEventListener("focus", () => show({ target: hit }));
    hit.addEventListener("blur", hideTooltip);
    svg.append(hit);
  });

  wrap.append(svg);
}

/* --- daily column chart (SVG) --- */
const SVG_NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
function niceMax(v) {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}
// column with 4px rounded top, square baseline
function columnPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

function renderDailyChart(perDay) {
  const wrap = $("#daily-chart");
  wrap.textContent = "";

  const W = 400, H = 190;
  const pad = { top: 22, right: 6, bottom: 24, left: 38 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  const maxVal = niceMax(Math.max(...perDay.map((d) => d.total), 0));
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Bar chart of spending per day" });

  // gridlines + y ticks (0, half, max)
  for (const t of [0, 0.5, 1]) {
    const y = pad.top + ih - ih * t;
    svg.append(svgEl("line", { x1: pad.left, x2: W - pad.right, y1: y, y2: y, class: "chart-grid" }));
    const tick = svgEl("text", { x: pad.left - 7, y: y + 3.5, "text-anchor": "end", class: "chart-tick" });
    tick.textContent = "$" + Math.round(maxVal * t).toLocaleString("en-US");
    svg.append(tick);
  }

  const n = perDay.length;
  const band = iw / n;
  const colW = Math.min(24, band * 0.66);
  const maxDay = perDay.reduce((a, b) => (b.total > a.total ? b : a), perDay[0]);

  perDay.forEach((d, i) => {
    const cx = pad.left + band * i + band / 2;
    const h = maxVal > 0 ? (d.total / maxVal) * ih : 0;
    const y = pad.top + ih - h;

    if (d.total > 0) {
      const col = svgEl("path", { d: columnPath(cx - colW / 2, y, colW, h, 4), class: "chart-col" });
      svg.append(col);
      // direct label on the peak day only; tooltip + axis carry the rest
      if (d === maxDay) {
        const lbl = svgEl("text", { x: cx, y: y - 6, "text-anchor": "middle", class: "chart-toplabel" });
        lbl.textContent = money(d.total);
        svg.append(lbl);
      }
    }

    // x labels: first, last, and every few in between
    const step = n > 14 ? 7 : n > 7 ? 2 : 1;
    if (i % step === 0 || i === n - 1) {
      const xl = svgEl("text", { x: cx, y: H - 7, "text-anchor": "middle", class: "chart-tick" });
      xl.textContent = d.date.toLocaleDateString("en-US", n > 7 ? { day: "numeric" } : { weekday: "narrow" });
      svg.append(xl);
    }

    // full-band hit target with hover tooltip
    const hit = svgEl("rect", { x: pad.left + band * i, y: pad.top, width: band, height: ih, class: "chart-hit", tabindex: "0" });
    const show = (ev) => {
      svg.querySelectorAll(".chart-col").forEach((c) => c.classList.add("is-dim"));
      const cols = svg.querySelectorAll(".chart-col");
      // un-dim this day's column
      let ci = 0;
      perDay.forEach((dd, j) => { if (dd.total > 0) { if (j === i) cols[ci].classList.remove("is-dim"); ci++; } });
      showTooltip(
        money(d.total, true),
        d.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        ev
      );
    };
    const hide = () => {
      svg.querySelectorAll(".chart-col").forEach((c) => c.classList.remove("is-dim"));
      hideTooltip();
    };
    hit.addEventListener("pointermove", show);
    hit.addEventListener("pointerleave", hide);
    hit.addEventListener("focus", (e) => show({ target: hit }));
    hit.addEventListener("blur", hide);
    svg.append(hit);
  });

  wrap.append(svg);
}

/* --- category bars (HTML) --- */
function renderCatChart(perCat, total) {
  const wrap = $("#cat-chart");
  wrap.textContent = "";

  const rows = [...perCat.entries()]
    .map(([id, amount]) => ({ cat: catById(id), amount }))
    .sort((a, b) => b.amount - a.amount);

  if (rows.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No spending yet.";
    wrap.append(p);
    return;
  }

  const maxAmount = rows[0].amount;
  for (const r of rows) {
    const row = document.createElement("div");
    row.className = "cat-row";

    const icon = document.createElement("span");
    icon.className = "cat-row-icon";
    icon.innerHTML = r.cat.icon;

    const main = document.createElement("div");
    main.className = "cat-row-main";

    const top = document.createElement("div");
    top.className = "cat-row-top";
    const label = document.createElement("span");
    label.className = "cat-row-label";
    label.textContent = r.cat.label;
    const value = document.createElement("span");
    value.className = "cat-row-value";
    const pct = total > 0 ? Math.round((r.amount / total) * 100) : 0;
    value.textContent = `${money(r.amount)} · ${pct}%`;
    top.append(label, value);

    const track = document.createElement("div");
    track.className = "cat-row-track";
    const fill = document.createElement("div");
    fill.className = "cat-row-fill";
    fill.style.width = (maxAmount > 0 ? (r.amount / maxAmount) * 100 : 0).toFixed(1) + "%";
    track.append(fill);

    main.append(top, track);
    row.append(icon, main);
    wrap.append(row);
  }
}

/* ============ Settings ============ */
function renderLimitRows() {
  const wrap = $("#limit-rows");
  wrap.textContent = "";
  for (const cat of CATEGORIES) {
    const row = document.createElement("label");
    row.className = "limit-row";

    const icon = document.createElement("span");
    icon.className = "limit-icon";
    icon.innerHTML = cat.icon;

    const label = document.createElement("span");
    label.className = "limit-label";
    label.textContent = cat.label;

    const box = document.createElement("div");
    box.className = "limit-input";
    const sym = document.createElement("span");
    sym.textContent = "$";
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.placeholder = "—";
    input.dataset.cat = cat.id;
    const v = store.categoryBudgets[cat.id];
    if (v > 0) input.value = String(v);
    box.append(sym, input);

    row.append(icon, label, box);
    wrap.append(row);
  }
}

function renderRecurringList() {
  const list = $("#recurring-list");
  list.textContent = "";
  $("#recurring-empty").hidden = store.recurring.length > 0;

  for (const rule of store.recurring) {
    const cat = catById(rule.category);
    const li = document.createElement("li");
    li.className = "txn";

    const icon = document.createElement("span");
    icon.className = "txn-icon";
    icon.innerHTML = cat.icon;

    const main = document.createElement("div");
    main.className = "txn-main is-static";
    const title = document.createElement("p");
    title.className = "txn-title";
    title.textContent = rule.note || cat.label;
    const meta = document.createElement("p");
    meta.className = "txn-meta";
    meta.textContent = `Day ${rule.day} each month · next ${friendlyDate(nextDueKey(rule))}`;
    main.append(title, meta);

    const amount = document.createElement("span");
    amount.className = "txn-amount";
    amount.textContent = money(rule.amount, true);

    const del = document.createElement("button");
    del.className = "txn-del";
    del.type = "button";
    del.textContent = "×";
    del.setAttribute("aria-label", "Stop repeating");
    del.addEventListener("click", () => {
      if (!confirm(`Stop repeating "${rule.note || cat.label}"? Already-added purchases stay.`)) return;
      store.recurring = store.recurring.filter((r) => r.id !== rule.id);
      saveStore();
      renderRecurringList();
    });

    li.append(icon, main, amount, del);
    list.append(li);
  }
}

function updateRolloverUI(mode) {
  document.querySelectorAll("#rollover-seg .seg-btn").forEach((b) => {
    const on = b.dataset.rollover === mode;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", String(on));
  });
  $("#rollover-hint").textContent = mode === "spread"
    ? "Spend under your daily amount and the rest is shared across the days left, raising what you can spend later."
    : "A flat daily amount. Whatever you don't spend builds toward your savings.";
}

function renderSettings() {
  $("#in-budget").value = store.monthlyBudget != null ? String(store.monthlyBudget) : "";
  $("#in-savings").value = store.savingsGoal > 0 ? String(store.savingsGoal) : "";
  $("#in-cyclestart").value = String(cycleStartDay());
  updateRolloverUI(store.rolloverMode === "spread" ? "spread" : "save");
  renderLimitRows();
  renderRecurringList();
}

function parseNonNeg(raw) {
  const s = String(raw).trim();
  if (!s) return 0;
  const n = parseFloat(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function setupSettings() {
  $("#rollover-seg").addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (btn) updateRolloverUI(btn.dataset.rollover);
  });

  $("#in-budget").addEventListener("input", () => setFieldError($("#in-budget"), $("#budget-error"), null));
  $("#in-savings").addEventListener("input", () => setFieldError($("#in-savings"), $("#savings-error"), null));

  $("#settings-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = parseAmount($("#in-budget").value);
    if (v == null) {
      setFieldError($("#in-budget"), $("#budget-error"), "Enter a monthly budget greater than zero.");
      $("#in-budget").focus();
      return;
    }
    setFieldError($("#in-budget"), $("#budget-error"), null);
    const goal = parseNonNeg($("#in-savings").value);
    if (goal == null || goal >= v) {
      setFieldError($("#in-savings"), $("#savings-error"),
        goal == null ? "Enter a savings goal of zero or more." : "Savings goal must be less than the monthly budget.");
      $("#in-savings").select();
      return;
    }
    setFieldError($("#in-savings"), $("#savings-error"), null);
    const startRaw = parseInt($("#in-cyclestart").value, 10);
    const start = Number.isFinite(startRaw) ? Math.min(28, Math.max(1, startRaw)) : 1;
    const activeRoll = $("#rollover-seg .seg-btn.is-active");
    const rollover = activeRoll && activeRoll.dataset.rollover === "spread" ? "spread" : "save";

    const limits = {};
    for (const input of document.querySelectorAll("#limit-rows input")) {
      const n = parseNonNeg(input.value);
      if (n != null && n > 0) limits[input.dataset.cat] = n;
    }

    store.monthlyBudget = v;
    store.savingsGoal = goal;
    store.cycleStartDay = start;
    store.rolloverMode = rollover;
    store.categoryBudgets = limits;
    saveStore();
    renderAll();

    const note = $("#save-note");
    note.textContent = "Saved.";
    setTimeout(() => { note.textContent = ""; }, 1800);
  });

  setupBackup();
}

/* ============ Backup (export / import / erase) ============ */
function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function setupBackup() {
  $("#btn-export").addEventListener("click", () => {
    downloadBlob(JSON.stringify(store, null, 2), "application/json", `budget-backup-${todayKey()}.json`);
  });

  $("#btn-export-csv").addEventListener("click", () => {
    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = ["date,amount,category,note"];
    for (const p of sortedPurchases()) {
      lines.push([p.date, p.amount.toFixed(2), catById(p.category).label, esc(p.note || "")].join(","));
    }
    downloadBlob(lines.join("\n"), "text/csv", `budget-${todayKey()}.csv`);
  });

  $("#btn-import").addEventListener("click", () => $("#in-import").click());
  $("#in-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.purchases)) throw new Error("bad shape");
        if (!confirm(`Replace your current data with this backup (${data.purchases.length} purchases)?`)) return;
        store.monthlyBudget = validAmount(data.monthlyBudget) ? cents(data.monthlyBudget) : null;
        store.savingsGoal = typeof data.savingsGoal === "number" && Number.isFinite(data.savingsGoal) && data.savingsGoal >= 0 ? cents(data.savingsGoal) : 0;
        store.cycleStartDay = typeof data.cycleStartDay === "number" ? Math.min(28, Math.max(1, Math.round(data.cycleStartDay))) : 1;
        store.categoryBudgets = sanitizeLimits(data.categoryBudgets);
        store.recurring = sanitizeRecurring(data.recurring);
        store.rolloverMode = data.rolloverMode === "spread" ? "spread" : "save";
        store.purchases = sanitizePurchases(data.purchases);
        saveStore();
        renderSettings();
        renderAll();
      } catch (_) {
        alert("That file isn't a valid budget backup.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  $("#btn-erase").addEventListener("click", () => {
    if (!confirm("Erase ALL data — purchases, budget, and settings? This cannot be undone.")) return;
    if (!confirm("Really erase everything? Consider exporting a backup first.")) return;
    localStorage.removeItem(STORE_KEY);
    location.reload();
  });
}

/* ============ Tooltip ============ */
const tooltip = document.getElementById("tooltip");
function showTooltip(valueText, labelText, ev) {
  tooltip.textContent = "";
  const strong = document.createElement("strong");
  strong.textContent = valueText;
  tooltip.append(strong, document.createTextNode(labelText));
  tooltip.hidden = false;
  const rect = ev.target.getBoundingClientRect();
  const x = ev.clientX != null ? ev.clientX : rect.left + rect.width / 2;
  tooltip.style.left = Math.max(70, Math.min(window.innerWidth - 70, x)) + "px";
  tooltip.style.top = rect.top + "px";
}
function hideTooltip() { tooltip.hidden = true; }

/* ============ Navigation & controls ============ */
function renderAll() {
  renderHome(false);
  renderInsights();
  if (state.view === "history") renderHistory();
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("is-active", v.id === "view-" + view));
  document.querySelectorAll(".tab").forEach((t) => {
    const active = t.dataset.view === view;
    t.classList.toggle("is-active", active);
    if (active) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });
  if (view === "home") renderHome(true);
  if (view === "history") renderHistory();
  if (view === "insights") renderInsights();
  if (view === "settings") renderSettings();
  if (view === "add") $("#in-amount").focus();
  window.scrollTo(0, 0);
}

function setupSeg(segId, key, onChange) {
  $(segId).addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    state[key] = btn.dataset[key === "period" ? "period" : "range"];
    $(segId).querySelectorAll(".seg-btn").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });
    onChange();
  });
}

/* ============ Init ============ */
processRecurring();

document.querySelector(".tabbar").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  if (tab.dataset.view === "add" && state.editingId) resetAddForm(); // + always starts a fresh entry
  switchView(tab.dataset.view);
});
$("#btn-budget").addEventListener("click", () => switchView("settings"));
$("#btn-view-all").addEventListener("click", () => switchView("history"));
// Debounced so a fast typist doesn't rebuild the (up to 300-row) history list
// on every keystroke — only after a 150ms pause.
let searchTimer = null;
$("#in-search").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.histQuery = e.target.value;
    renderHistory();
  }, 150);
});
setupSeg("#period-seg", "period", renderHome);
setupSeg("#range-seg", "range", renderInsights);
setupAddForm();
renderCatGrid();
setupSettings();
renderHome(true);
renderInsights();

// first run: take the user straight to Settings to set a budget
if (store.monthlyBudget == null && store.purchases.length === 0) {
  switchView("settings");
}

// offline support when installed as a web app (https only; no-op elsewhere)
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
