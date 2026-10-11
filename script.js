/* ============================================================
   Climate Intelligence Dashboard — script.js
   Vanilla JS | Chart.js v4 | Dark Mode ESG Dashboard
   ============================================================ */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const DATA_URL = 'climate_data.json';

const COLORS = {
  emerald : '#10b981',
  cyan    : '#06b6d4',
  amber   : '#f59e0b',
  rose    : '#f87171',
  purple  : '#a78bfa',
  slate   : '#64748b',
  grid    : 'rgba(148,163,184,0.08)',
  tick    : '#475569',
};

const CHART_DEFAULTS = {
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: { size: 12, family: 'Inter, ui-sans-serif' },
        boxWidth: 12,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      padding: 10,
      cornerRadius: 8,
    },
  },
  animation: { duration: 500, easing: 'easeInOutQuart' },
};

// ─── State ────────────────────────────────────────────────────────────────────

let allData    = [];
let charts     = {};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────

const elRegion    = document.getElementById('filter-region');
const elRisk      = document.getElementById('filter-risk');
const elBadge     = document.getElementById('record-badge');
const elTableBody = document.getElementById('data-table-body');

// KPI elements
const el = (id) => document.getElementById(id);

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allData = await res.json();

    initCharts();
    elRegion.addEventListener('change', applyFilters);
    elRisk.addEventListener('change', applyFilters);
    applyFilters();
  } catch (err) {
    console.error('[Dashboard] Failed to load data:', err);
    showError();
  }
}

// ─── Filter Logic ─────────────────────────────────────────────────────────────

function applyFilters() {
  const region = elRegion.value;
  const risk   = elRisk.value;

  const filtered = allData.filter(d => {
    const matchRegion = (region === 'all') || (d.region === region);
    const matchRisk   = (risk === 'all')   || (d.risk_level === risk);
    return matchRegion && matchRisk;
  });

  elBadge.textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;

  updateKPIs(filtered);
  updateCharts(filtered);
  updateTable(filtered);
}

// ─── KPI Calculations ─────────────────────────────────────────────────────────

function avg(arr, key) {
  if (!arr.length) return 0;
  return arr.reduce((s, d) => s + d[key], 0) / arr.length;
}

function sum(arr, key) {
  return arr.reduce((s, d) => s + d[key], 0);
}

function updateKPIs(data) {
  if (!data.length) {
    ['kpi-temp', 'kpi-co2', 'kpi-renewable', 'kpi-alerts'].forEach(id => {
      el(id).textContent = '—';
    });
    ['kpi-temp-trend','kpi-co2-trend','kpi-renewable-trend','kpi-alerts-trend'].forEach(id => {
      el(id).textContent = '';
      el(id).className = 'kpi-trend';
    });
    return;
  }

  const avgTemp      = avg(data, 'temp_anomaly');
  const avgCO2       = avg(data, 'co2_ppm');
  const avgRenewable = avg(data, 'renewable_energy_pct');
  const totalAlerts  = sum(data, 'alerts');

  el('kpi-temp').textContent      = avgTemp.toFixed(2);
  el('kpi-co2').textContent       = Math.round(avgCO2);
  el('kpi-renewable').textContent = avgRenewable.toFixed(1) + '%';
  el('kpi-alerts').textContent    = totalAlerts;

  // Trend indicators vs. global averages
  const globalTemp      = avg(allData, 'temp_anomaly');
  const globalCO2       = avg(allData, 'co2_ppm');
  const globalRenewable = avg(allData, 'renewable_energy_pct');
  const globalAlerts    = sum(allData, 'alerts');

  setTrend('kpi-temp-trend',      avgTemp,      globalTemp,      '°C', false);
  setTrend('kpi-co2-trend',       avgCO2,       globalCO2,       'ppm', false);
  setTrend('kpi-renewable-trend', avgRenewable, globalRenewable, '%', true);
  setTrend('kpi-alerts-trend',    totalAlerts,  globalAlerts,    '', false);
}

/**
 * higherIsBetter = true  → higher value = green (good)
 * higherIsBetter = false → higher value = red (bad)
 */
function setTrend(elId, value, baseline, unit, higherIsBetter) {
  const el_ = el(elId);
  if (allData.length === 0 || value === baseline) {
    el_.textContent = '— neutral';
    el_.className = 'kpi-trend neutral';
    return;
  }
  const diff  = value - baseline;
  const pct   = ((Math.abs(diff) / baseline) * 100).toFixed(1);
  const isUp  = diff > 0;
  const isGood = higherIsBetter ? isUp : !isUp;

  el_.textContent = `${isUp ? '▲' : '▼'} ${pct}%`;
  el_.className   = `kpi-trend ${isGood ? 'up' : 'down'}`;
}

// ─── Chart Helpers ────────────────────────────────────────────────────────────

function makeGridOptions(axes = {}) {
  const base = {
    plugins: { ...CHART_DEFAULTS.plugins },
    animation: CHART_DEFAULTS.animation,
    scales: {
      x: {
        ticks: { color: COLORS.tick, font: { size: 11 } },
        grid:  { color: COLORS.grid },
        ...axes.x,
      },
      y: {
        ticks: { color: COLORS.tick, font: { size: 11 } },
        grid:  { color: COLORS.grid },
        ...axes.y,
      },
    },
  };
  return base;
}

// ─── Chart Initialisation ─────────────────────────────────────────────────────

function initCharts() {
  // CO2 Line Chart
  charts.co2 = new Chart(el('chart-co2'), {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      ...makeGridOptions(),
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { display: false },
      },
    },
  });

  // Energy Mix Doughnut
  charts.energy = new Chart(el('chart-energy'), {
    type: 'doughnut',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: {
          position: 'bottom',
          labels: { ...CHART_DEFAULTS.plugins.legend.labels },
        },
      },
      cutout: '62%',
    },
  });

  // Renewable Bar Chart
  charts.renewable = new Chart(el('chart-renewable'), {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      ...makeGridOptions({ y: { beginAtZero: true, max: 100 } }),
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { display: false },
      },
    },
  });

  // Risk Polar Area — enhanced
  charts.risk = new Chart(el('chart-risk'), {
    type: 'polarArea',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },           // replaced by custom legend strip
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw} record${ctx.raw !== 1 ? 's' : ''}`,
          },
        },
      },
      scales: {
        r: {
          ticks: {
            color: COLORS.tick,
            font: { size: 9, family: 'Inter, ui-sans-serif' },
            backdropColor: 'transparent',
            count: 3,
          },
          grid:  { color: 'rgba(148,163,184,0.12)' },
          pointLabels: {
            color: '#94a3b8',
            font: { size: 11, weight: '600', family: 'Inter, ui-sans-serif' },
          },
          angleLines: { color: 'rgba(148,163,184,0.06)' },
          beginAtZero: true,
        },
      },
    },
  });
}

// ─── Chart Updates ────────────────────────────────────────────────────────────

function updateCharts(data) {
  updateCO2Chart(data);
  updateEnergyChart(data);
  updateRenewableChart(data);
  updateRiskChart(data);
}

/* CO2 Line — sorted by date, one point per record */
function updateCO2Chart(data) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const labels  = sorted.map(d => d.date);
  const values  = sorted.map(d => d.co2_ppm);

  charts.co2.data.labels = labels;
  charts.co2.data.datasets = [{
    label: 'CO₂ (ppm)',
    data: values,
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(6,182,212,0.1)',
    borderWidth: 2.5,
    pointBackgroundColor: COLORS.cyan,
    pointBorderColor: '#0f172a',
    pointBorderWidth: 2,
    pointRadius: 5,
    pointHoverRadius: 7,
    tension: 0.4,
    fill: true,
  }];
  charts.co2.update();
}

/* Energy Mix Doughnut — average across filtered records */
function updateEnergyChart(data) {
  if (!data.length) {
    charts.energy.data.labels = [];
    charts.energy.data.datasets = [];
    charts.energy.update();
    return;
  }

  const keys = ['solar', 'wind', 'hydro', 'fossil'];
  const labels = ['Solar', 'Wind', 'Hydro', 'Fossil'];
  const values = keys.map(k => avg(data.map(d => ({ v: d.energy_mix[k] })), 'v'));

  charts.energy.data.labels = labels;
  charts.energy.data.datasets = [{
    data: values.map(v => +v.toFixed(2)),
    backgroundColor: [COLORS.amber, COLORS.emerald, COLORS.cyan, COLORS.slate],
    borderColor: '#0f172a',
    borderWidth: 3,
    hoverOffset: 8,
  }];
  charts.energy.update();
}

/* Renewable Bar — avg per region (always all 5 regions) */
function updateRenewableChart(data) {
  const regions = ['Asia Pacific', 'Europe', 'North America', 'Africa', 'Latin America'];
  const values  = regions.map(r => {
    const subset = data.filter(d => d.region === r);
    return subset.length ? +avg(subset, 'renewable_energy_pct').toFixed(1) : null;
  });

  const gradient = [
    'rgba(16,185,129,0.8)',
    'rgba(6,182,212,0.8)',
    'rgba(245,158,11,0.8)',
    'rgba(248,113,113,0.8)',
    'rgba(167,139,250,0.8)',
  ];

  charts.renewable.data.labels = regions.map(r => r.replace(' ', '\n'));
  charts.renewable.data.datasets = [{
    label: 'Renewable %',
    data: values,
    backgroundColor: gradient,
    borderColor: gradient.map(c => c.replace('0.8', '1')),
    borderWidth: 1,
    borderRadius: 6,
    borderSkipped: false,
  }];
  charts.renewable.options.scales.x.ticks.maxRotation = 0;
  charts.renewable.update();
}

/* Risk Polar Area — count per risk level + legend strip + center label */
function updateRiskChart(data) {
  const levels = ['Low', 'Medium', 'High', 'Critical'];
  const counts = levels.map(l => data.filter(d => d.risk_level === l).length);
  const total  = counts.reduce((a, b) => a + b, 0);

  const bgColors = [
    'rgba(16,185,129,0.55)',
    'rgba(245,158,11,0.55)',
    'rgba(251,146,60,0.55)',
    'rgba(248,113,113,0.55)',
  ];
  const borderColors = [
    'rgba(16,185,129,1)',
    'rgba(245,158,11,1)',
    'rgba(251,146,60,1)',
    'rgba(248,113,113,1)',
  ];
  const hoverBg = [
    'rgba(16,185,129,0.8)',
    'rgba(245,158,11,0.8)',
    'rgba(251,146,60,0.8)',
    'rgba(248,113,113,0.8)',
  ];

  charts.risk.data.labels = levels;
  charts.risk.data.datasets = [{
    data: counts,
    backgroundColor: bgColors,
    borderColor: borderColors,
    borderWidth: 2,
    hoverBackgroundColor: hoverBg,
    hoverBorderWidth: 2.5,
  }];
  charts.risk.update();

  // Update center label
  el('polar-center-value').textContent = total || '—';

  // Update legend strip counts
  levels.forEach(l => {
    const countEl = document.getElementById(`rl-count-${l}`);
    if (countEl) {
      const n = data.filter(d => d.risk_level === l).length;
      countEl.textContent = n;
      countEl.style.opacity = n === 0 ? '0.35' : '1';
    }
  });
}

// ─── Table Update ─────────────────────────────────────────────────────────────

function updateTable(data) {
  if (!data.length) {
    elTableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
            </svg>
            <span>No records match the selected filters</span>
          </div>
        </td>
      </tr>`;
    return;
  }

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  elTableBody.innerHTML = sorted.map(d => `
    <tr>
      <td class="table-td font-mono text-slate-300">${d.date}</td>
      <td class="table-td">${d.region}</td>
      <td class="table-td">
        <span class="font-semibold ${d.temp_anomaly >= 1.8 ? 'text-rose-400' : d.temp_anomaly >= 1.4 ? 'text-amber-400' : 'text-emerald-400'}">
          ${d.temp_anomaly.toFixed(1)}
        </span>
      </td>
      <td class="table-td text-cyan-400 font-medium">${d.co2_ppm}</td>
      <td class="table-td">
        <div class="flex items-center gap-2">
          <div class="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div class="h-full rounded-full bg-emerald-500" style="width:${Math.min(d.renewable_energy_pct,100)}%"></div>
          </div>
          <span class="text-emerald-400 font-medium">${d.renewable_energy_pct.toFixed(1)}%</span>
        </div>
      </td>
      <td class="table-td">
        <span class="risk-badge risk-${d.risk_level}">
          <span class="risk-dot"></span>
          ${d.risk_level}
        </span>
      </td>
      <td class="table-td">
        <span class="font-semibold ${d.alerts >= 8 ? 'text-rose-400' : d.alerts >= 4 ? 'text-amber-400' : 'text-slate-300'}">
          ${d.alerts}
        </span>
      </td>
    </tr>`).join('');
}

// ─── Error State ──────────────────────────────────────────────────────────────

function showError() {
  document.querySelector('main').innerHTML = `
    <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div class="w-14 h-14 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-400">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-slate-200">Failed to load climate data</h2>
      <p class="text-sm text-slate-400 max-w-sm">
        Could not fetch <code class="text-slate-300">climate_data.json</code>. 
        Make sure you are serving this dashboard from a local web server (e.g. <code>npx serve .</code> or VS Code Live Server).
      </p>
    </div>`;
}

// ─── Run ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
