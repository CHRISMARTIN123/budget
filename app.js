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

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.purchases)) {
        if (typeof data.savingsGoal !== "number") data.savingsGoal = 0;
        return data;
      }
    }
  } catch (_) { /* corrupted store — start fresh */ }
  return { monthlyBudget: null, savingsGoal: 0, purchases: [] };
}
function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

const store = loadStore();
const state = { period: "month", range: "7", view: "home", selectedCat: "food", editingId: null };

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

/* ============ Money ============ */
const fmtWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
function money(n, forceCents) {
  const useCents = forceCents || Math.abs(n % 1) > 0.004;
  return (useCents ? fmtCents : fmtWhole).format(n);
}

/* ============ Aggregation ============ */
function spentBetween(from, to) { // [from, to) as Date, date-key comparison
  const a = dateKey(from), b = dateKey(to);
  let sum = 0;
  for (const p of store.purchases) if (p.date >= a && p.date < b) sum += p.amount;
  return sum;
}

function periodInfo() {
  const now = new Date();
  const dim = daysInMonth(now);
  // what's available to spend after the savings goal is set aside
  const spendable = store.monthlyBudget == null
    ? null
    : Math.max(0, store.monthlyBudget - (store.savingsGoal || 0));
  if (state.period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { label: "Left this month", budget: spendable, spent: spentBetween(from, to), daysLeft: dim - now.getDate() + 1 };
  }
  if (state.period === "week") {
    const from = startOfWeek(now);
    const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
    const wBudget = spendable == null ? null : (spendable / dim) * 7;
    const daysLeft = Math.round((to - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / DAY_MS);
    return { label: "Left this week", budget: wBudget, spent: spentBetween(from, to), daysLeft };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  return { label: "Left today", budget: spendable == null ? null : spendable / dim, spent: spentBetween(from, to), daysLeft: 0 };
}

/* ============ Home ============ */
const $ = (sel) => document.querySelector(sel);

function renderHome() {
  const info = periodInfo();
  $("#hero-label").textContent = info.label;

  const heroValue = $("#hero-value");
  const heroSub = $("#hero-sub");
  const meterFill = $("#meter-fill");

  if (info.budget == null) {
    heroValue.textContent = money(-info.spent || 0);
    heroSub.textContent = "Set a monthly budget to track what's left.";
    meterFill.style.width = "0%";
  } else {
    const left = info.budget - info.spent;
    heroValue.textContent = money(left);
    const parts = [`of ${money(info.budget)}`];
    if (state.period === "month" && (store.savingsGoal || 0) > 0) parts.push(`saving ${money(store.savingsGoal)}`);
    if (state.period !== "day") parts.push(`${info.daysLeft} day${info.daysLeft === 1 ? "" : "s"} left`);
    if (left < 0) parts.push("over budget");
    heroSub.textContent = parts.join(" · ");
    const pct = info.budget > 0 ? Math.min(100, (info.spent / info.budget) * 100) : 100;
    meterFill.style.width = pct.toFixed(1) + "%";
  }

  $("#btn-budget").textContent = store.monthlyBudget == null ? "Set budget" : "Settings";
  renderSavings();
  renderRecent();
}

/* ============ Savings ============ */
// Savings accrue day by day: everything not spent from the prorated monthly
// budget counts toward the goal, so under-spending a day adds to savings and
// over-spending eats into them.
function renderSavings() {
  const card = $("#savings-card");
  const goal = store.savingsGoal || 0;
  if (store.monthlyBudget == null || goal <= 0) { card.hidden = true; return; }
  card.hidden = false;

  const now = new Date();
  const dim = daysInMonth(now);
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const spent = spentBetween(from, to);

  const accrued = store.monthlyBudget * (now.getDate() / dim); // budget earned so far this month
  const saved = accrued - spent;
  const pace = goal * (now.getDate() / dim); // where savings should be today

  $("#savings-value").textContent = money(saved, true);
  $("#savings-fill").style.width = Math.max(0, Math.min(100, (saved / goal) * 100)).toFixed(1) + "%";

  const sub = $("#savings-sub");
  if (saved < 0) {
    sub.textContent = `Over budget by ${money(-saved, true)} — spending is eating into savings.`;
  } else {
    const pct = Math.round((saved / goal) * 100);
    const paceText = saved >= pace ? "on pace" : "behind pace";
    sub.textContent = `${pct}% of your ${money(goal)} goal · ${paceText}`;
  }
}

function friendlyDate(key) {
  const t = todayKey();
  if (key === t) return "Today";
  if (key === dateKey(new Date(Date.now() - DAY_MS))) return "Yesterday";
  return parseKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function renderRecent() {
  const list = $("#recent-list");
  list.textContent = "";
  const items = [...store.purchases]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .slice(0, 25);

  $("#recent-empty").hidden = items.length > 0;

  for (const p of items) {
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
    title.textContent = p.note || cat.label;
    const meta = document.createElement("p");
    meta.className = "txn-meta";
    meta.textContent = `${cat.label} · ${friendlyDate(p.date)}`;
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
      if (!confirm(`Delete ${money(p.amount, true)} (${title.textContent})?`)) return;
      store.purchases = store.purchases.filter((x) => x.id !== p.id);
      saveStore();
      renderHome();
      renderInsights();
    });

    li.append(icon, main, amount, del);
    list.append(li);
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

function resetAddForm() {
  state.editingId = null;
  $("#add-form").reset();
  $("#in-date").value = todayKey();
  $("#add-title").textContent = "Add purchase";
  $("#btn-save-purchase").textContent = "Save purchase";
}

function startEdit(p) {
  state.editingId = p.id;
  state.selectedCat = p.category;
  renderCatGrid();
  $("#in-amount").value = p.amount.toFixed(2);
  $("#in-note").value = p.note || "";
  $("#in-date").value = p.date;
  $("#add-title").textContent = "Edit purchase";
  $("#btn-save-purchase").textContent = "Save changes";
  switchView("add");
}

function setupAddForm() {
  const form = $("#add-form");
  $("#in-date").value = todayKey();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = parseAmount($("#in-amount").value);
    if (amount == null) { $("#in-amount").focus(); return; }
    const date = $("#in-date").value || todayKey();
    const note = $("#in-note").value.trim();

    const editing = state.editingId && store.purchases.find((p) => p.id === state.editingId);
    if (editing) {
      Object.assign(editing, { amount, category: state.selectedCat, note, date });
    } else {
      store.purchases.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        amount,
        category: state.selectedCat,
        note,
        date,
        createdAt: Date.now(),
      });
    }
    saveStore();
    resetAddForm();
    switchView("home");
  });
}

/* ============ Insights ============ */
function rangeInfo() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (state.range === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, days: Math.round((today - from) / DAY_MS) + 1 };
  }
  const days = Number(state.range);
  return { from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1), days };
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

  // stat tiles
  $("#stat-total").textContent = money(total);
  $("#stat-avg").textContent = money(days > 0 ? total / days : 0);
  const max = perDay.reduce((a, b) => (b.total > a.total ? b : a), perDay[0] || { total: 0 });
  $("#stat-max").textContent = money(max ? max.total : 0);
  $("#stat-max-day").textContent = max && max.total > 0
    ? max.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "";

  $("#insights-empty").hidden = total > 0;
  renderDailyChart(perDay);
  renderCatChart(perCat, total);
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
function switchView(view) {
  state.view = view;
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("is-active", v.id === "view-" + view));
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.view === view));
  if (view === "home") renderHome();
  if (view === "insights") renderInsights();
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

function parseNonNeg(raw) {
  const s = String(raw).trim();
  if (!s) return 0;
  const n = parseFloat(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function setupBudgetDialog() {
  const dialog = $("#budget-dialog");
  $("#btn-budget").addEventListener("click", () => {
    $("#in-budget").value = store.monthlyBudget != null ? String(store.monthlyBudget) : "";
    $("#in-savings").value = store.savingsGoal > 0 ? String(store.savingsGoal) : "";
    dialog.showModal();
  });
  $("#btn-budget-cancel").addEventListener("click", () => dialog.close("cancel"));
  $("#budget-form").addEventListener("submit", (e) => {
    const v = parseAmount($("#in-budget").value);
    if (v == null) { e.preventDefault(); $("#in-budget").focus(); return; }
    const goal = parseNonNeg($("#in-savings").value);
    if (goal == null || goal >= v) { e.preventDefault(); $("#in-savings").select(); return; }
    store.monthlyBudget = v;
    store.savingsGoal = goal;
    saveStore();
    renderHome();
  });
  setupBackup(dialog);
}

/* ============ Backup (export / import) ============ */
function setupBackup(dialog) {
  $("#btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `budget-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
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
        store.monthlyBudget = typeof data.monthlyBudget === "number" ? data.monthlyBudget : null;
        store.savingsGoal = typeof data.savingsGoal === "number" ? data.savingsGoal : 0;
        store.purchases = data.purchases.filter(
          (p) => p && typeof p.amount === "number" && typeof p.date === "string"
        );
        saveStore();
        renderHome();
        renderInsights();
        dialog.close("cancel");
      } catch (_) {
        alert("That file isn't a valid budget backup.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });
}

/* ============ Init ============ */
document.querySelector(".tabbar").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  if (tab.dataset.view === "add" && state.editingId) resetAddForm(); // + always starts a fresh entry
  switchView(tab.dataset.view);
});
setupSeg("#period-seg", "period", renderHome);
setupSeg("#range-seg", "range", renderInsights);
setupAddForm();
renderCatGrid();
setupBudgetDialog();
renderHome();
renderInsights();

// first run: prompt for a budget
if (store.monthlyBudget == null && store.purchases.length === 0) {
  setTimeout(() => $("#budget-dialog").showModal(), 400);
}

// offline support when installed as a web app (https only; no-op elsewhere)
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
