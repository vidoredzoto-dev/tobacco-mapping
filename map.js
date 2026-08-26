/* ═══════════════════════════════════════════════════════
   KRB Kutsaga Agricultural Observatory — map.js
   ═══════════════════════════════════════════════════════ */

/* ──────────────────────────────
   LAYER CONFIGURATION
────────────────────────────── */
const LAYERS_CONFIG = {
  dams:    { file: 'dams.geojson',                   color: '#3a7ebf', weight: 2,   fillOpacity: 0.50, label: 'Dams & Water'    },
  rivers:  { file: 'rivers.geojson',                 color: '#5ba3d4', weight: 2,   fillOpacity: 0.40, label: 'Rivers'          },
  roads:   { file: 'roads.geojson',                  color: '#d4c49a', weight: 2.5, fillOpacity: 0.00, label: 'Roads'           },
  station: { file: 'Kutsagaresearchstation.geojson', color: '#c8932a', weight: 2,   fillOpacity: 0.25, label: 'Research Station' },
  land1ab: { file: 'land1ab.geojson',                color: '#c8932a', weight: 1.5, fillOpacity: 0.50, label: 'Land 1ab'        },
  land1:   { file: 'land1.geojson',                  color: '#a67c2e', weight: 1.5, fillOpacity: 0.50, label: 'Land 1'          },
  land2:   { file: 'land2.geojson',                  color: '#6db85c', weight: 1.5, fillOpacity: 0.50, label: 'Land 2'          },
  land3:   { file: 'land3.geojson',                  color: '#4a7c3f', weight: 1.5, fillOpacity: 0.50, label: 'Land 3'          },
  land4:   { file: 'land4.geojson',                  color: '#8bc34a', weight: 1.5, fillOpacity: 0.50, label: 'Land 4'          },
  land5:   { file: 'land5.geojson',                  color: '#cddc39', weight: 1.5, fillOpacity: 0.50, label: 'Land 5'          },
  land6:   { file: 'land6.geojson',                  color: '#9e9d24', weight: 1.5, fillOpacity: 0.50, label: 'Land 6'          },
  land7:   { file: 'land7.geojson',                  color: '#f9a825', weight: 1.5, fillOpacity: 0.50, label: 'Land 7'          },
  land8:   { file: 'land8.geojson',                  color: '#e57c0f', weight: 1.5, fillOpacity: 0.50, label: 'Land 8'          },
  land9:   { file: 'land9.geojson',                  color: '#d84315', weight: 1.5, fillOpacity: 0.50, label: 'Land 9'          },
};

/* ──────────────────────────────
   STATE
────────────────────────────── */
const layers       = {};
let   map;
let   currentOpacity = 0.8;

/* ──────────────────────────────
   BASEMAPS
────────────────────────────── */
const BASEMAPS = {
  satellite: L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: '© Esri — Satellite Imagery', maxZoom: 19 }
  ),
  topo: L.tileLayer(
    'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    { attribution: '© OpenTopoMap', maxZoom: 17 }
  ),
  dark: L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    { attribution: '© CartoDB Dark', maxZoom: 19 }
  )
};

/* ──────────────────────────────
   MAP INITIALISATION
────────────────────────────── */
map = L.map('map', {
  center:      [-17.75, 31.0],
  zoom:        14,
  zoomControl: true,
  layers:      [BASEMAPS.satellite]
});

/* live coordinate display */
map.on('mousemove', e => {
  const lat = e.latlng.lat.toFixed(6);
  const lon = e.latlng.lng.toFixed(6);
  const txt = `Lat ${lat} · Lon ${lon}`;
  document.getElementById('coord-bar').textContent  = txt;
  document.getElementById('coord-info').textContent = txt;
});

/* ──────────────────────────────
   GEOJSON LOADING
────────────────────────────── */
async function loadLayer(key) {
  const cfg = LAYERS_CONFIG[key];
  try {
    const resp = await fetch(cfg.file);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const gj = await resp.json();

    const lyr = L.geoJSON(gj, {
      style: () => ({
        color:       cfg.color,
        weight:      cfg.weight,
        fillColor:   cfg.color,
        fillOpacity: cfg.fillOpacity * currentOpacity,
        opacity:     1,
      }),
      onEachFeature: (f, layer) => {
        layer.on('click',     ()  => showFeatureInfo(key, f, cfg));
        layer.on('mouseover', function () {
          this.setStyle({
            weight:      cfg.weight + 1.5,
            fillOpacity: Math.min(cfg.fillOpacity + 0.2, 0.9)
          });
        });
        layer.on('mouseout', function () { lyr.resetStyle(this); });

        /* tooltip */
        if (f.properties) {
          const name = f.properties.Name || f.properties.name
                    || f.properties.ID   || cfg.label;
          layer.bindTooltip(
            `<div class="map-tooltip">${name}</div>`,
            { sticky: true, opacity: 1, className: 'custom-tooltip' }
          );
        }
      }
    });

    layers[key] = lyr;
    lyr.addTo(map);

    /* auto-fit after first three layers are ready */
    if (Object.keys(layers).length === 3) autoFit();

  } catch (err) {
    console.warn(`Could not load ${cfg.file}:`, err);
    layers[key] = null;   /* placeholder so toggle is graceful */
  }
}

function autoFit() {
  try {
    const bounds = L.latLngBounds();
    Object.values(layers).forEach(l => {
      if (l) try { bounds.extend(l.getBounds()); } catch (_) {}
    });
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
  } catch (_) {}
}

/* ──────────────────────────────
   FEATURE INFO PANEL
────────────────────────────── */
function showFeatureInfo(key, feature, cfg) {
  const p       = feature.properties || {};
  const skip    = new Set(['geometry', 'type']);
  const entries = Object.entries(p).filter(([k]) => !skip.has(k));

  const panel = document.getElementById('feature-info');
  panel.className = 'info-panel has-data';

  if (entries.length === 0) {
    panel.innerHTML = `
      <div class="info-key">Layer</div>
      <div class="info-val">${cfg.label}</div>
      <p style="color:var(--text-muted);font-size:11px;margin-top:8px">No attributes available.</p>`;
  } else {
    panel.innerHTML = `
      <div class="info-key">Layer</div>
      <div class="info-val">${cfg.label}</div>
      ${entries.map(([k, v]) => `
        <div class="info-key">${k}</div>
        <div class="info-val">${v ?? '—'}</div>
      `).join('')}`;
  }

  /* switch to Info tab */
  switchTab('info', document.querySelectorAll('.tab-btn')[3]);
}

/* ──────────────────────────────
   TAB SWITCHING
────────────────────────────── */
function switchTab(name, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}

/* ──────────────────────────────
   LAYER TOGGLE
────────────────────────────── */
function toggleLayer(key, el) {
  const lyr = layers[key];
  const tog = document.getElementById('toggle-' + key);
  if (!lyr) return;

  if (map.hasLayer(lyr)) {
    map.removeLayer(lyr);
    tog.classList.remove('on');
    el.classList.remove('active-layer');
  } else {
    lyr.addTo(map);
    tog.classList.add('on');
    el.classList.add('active-layer');
  }
}

/* ──────────────────────────────
   BASEMAP SWITCHER
────────────────────────────── */
function setBasemap(name, btn) {
  document.querySelectorAll('.bm-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  Object.values(BASEMAPS).forEach(b => { if (map.hasLayer(b)) map.removeLayer(b); });
  BASEMAPS[name].addTo(map);
}

/* ──────────────────────────────
   OPACITY SLIDER
────────────────────────────── */
function setOpacity(val) {
  currentOpacity = val / 100;
  document.getElementById('opacity-val').textContent = val + '%';

  const landKeys = [
    'land1ab','land1','land2','land3','land4',
    'land5',  'land6','land7','land8','land9'
  ];
  landKeys.forEach(key => {
    const lyr = layers[key];
    if (!lyr) return;
    lyr.setStyle({ fillOpacity: LAYERS_CONFIG[key].fillOpacity * currentOpacity });
  });
}

/* ══════════════════════════════════════════════════════
   CHARTS
══════════════════════════════════════════════════════ */

/* shared tooltip style */
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(26,18,8,0.95)',
  titleColor:      '#c8932a',
  bodyColor:       '#f0e8d0',
  borderColor:     'rgba(200,147,42,0.3)',
  borderWidth:     1,
  titleFont:       { family: 'Space Mono', size: 10 },
  bodyFont:        { family: 'Space Mono', size: 10 },
};

const TICK_STYLE = { color: '#a89060', font: { family: 'Space Mono', size: 9 } };
const GRID_COLOR = 'rgba(200,147,42,0.08)';

/* ── Phenological NDVI Curves ── */
function buildNdviCurve() {
  const months = ['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul'];

  new Chart(document.getElementById('ndviChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label:            'Tobacco',
          data:             [0.21, 0.24, 0.35, 0.52, 0.63, 0.70, 0.73, 0.65, 0.48, 0.32, 0.24, 0.21],
          borderColor:      '#c8932a',
          backgroundColor:  'rgba(200,147,42,0.12)',
          fill: true, tension: 0.4, borderWidth: 2.5,
          pointRadius: 3,  pointBackgroundColor: '#c8932a',
        },
        {
          label:            'Maize',
          data:             [0.18, 0.22, 0.40, 0.58, 0.72, 0.78, 0.75, 0.60, 0.38, 0.24, 0.19, 0.18],
          borderColor:      '#6db85c',
          backgroundColor:  'rgba(109,184,92,0.10)',
          fill: true, tension: 0.4, borderWidth: 2.5,
          pointRadius: 3,  pointBackgroundColor: '#6db85c',
        },
        {
          label:            'Pasture',
          data:             [0.28, 0.31, 0.38, 0.45, 0.50, 0.52, 0.51, 0.48, 0.43, 0.37, 0.31, 0.28],
          borderColor:      '#8bc34a',
          backgroundColor:  'rgba(139,195,74,0.08)',
          fill: true, tension: 0.4, borderWidth: 2,
          pointRadius: 3,  pointBackgroundColor: '#8bc34a',
          borderDash: [4, 3],
        },
        {
          label:            'Woodland',
          data:             [0.55, 0.57, 0.60, 0.63, 0.67, 0.68, 0.69, 0.68, 0.65, 0.62, 0.58, 0.55],
          borderColor:      '#1e7a1e',
          backgroundColor:  'rgba(30,122,30,0.08)',
          fill: true, tension: 0.4, borderWidth: 2,
          pointRadius: 3,  pointBackgroundColor: '#1e7a1e',
          borderDash: [6, 3],
        },
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#a89060', font: { family: 'Space Mono', size: 9 }, boxWidth: 12, padding: 8 } },
        tooltip: TOOLTIP_STYLE,
      },
      scales: {
        x: { ticks: TICK_STYLE, grid: { color: GRID_COLOR } },
        y: {
          min: 0, max: 1,
          ticks: { ...TICK_STYLE, stepSize: 0.2 },
          grid:  { color: GRID_COLOR },
          title: { display: true, text: 'NDVI', color: '#a89060', font: { family: 'Space Mono', size: 9 } }
        }
      }
    }
  });
}

/* ── NDVI per Land Parcel ── */
function buildNdviBar() {
  new Chart(document.getElementById('ndviBar').getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['L1ab','L1','L2','L3','L4','L5','L6','L7','L8','L9'],
      datasets: [{
        label: 'Mean NDVI',
        data:  [0.64, 0.58, 0.52, 0.47, 0.55, 0.43, 0.39, 0.61, 0.35, 0.50],
        backgroundColor: [
          '#c8932a','#a67c2e','#6db85c','#4a7c3f',
          '#8bc34a','#cddc39','#9e9d24','#f9a825','#e57c0f','#d84315'
        ],
        borderRadius: 4, borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: TOOLTIP_STYLE },
      scales: {
        x: { ticks: TICK_STYLE, grid: { display: false } },
        y: { min: 0, max: 1, ticks: { ...TICK_STYLE, stepSize: 0.2 }, grid: { color: GRID_COLOR } }
      }
    }
  });
}

/* ── Land Use Distribution ── */
function buildLandUseChart() {
  new Chart(document.getElementById('landUseChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Tobacco','Maize','Pasture','Woodland','Water','Bare Soil'],
      datasets: [{
        label: 'Area (ha)',
        data:  [140, 85, 60, 45, 18, 22],
        backgroundColor: ['#c8932a','#6db85c','#8bc34a','#1e7a1e','#3a7ebf','#d84315'],
        borderRadius: 4, borderWidth: 0,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...TOOLTIP_STYLE,
          callbacks: { label: ctx => `  ${ctx.parsed.x} ha` }
        }
      },
      scales: {
        x: { ticks: TICK_STYLE, grid: { color: GRID_COLOR } },
        y: { ticks: TICK_STYLE, grid: { display: false } }
      }
    }
  });
}

function buildCharts() {
  buildNdviCurve();
  buildNdviBar();
  buildLandUseChart();
}

/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */
async function init() {
  buildCharts();

  /* load all GeoJSON layers in parallel */
  await Promise.allSettled(Object.keys(LAYERS_CONFIG).map(k => loadLayer(k)));

  /* final auto-fit across everything loaded */
  autoFit();

  /* fade out loader */
  setTimeout(() => {
    const loader = document.getElementById('loader');
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 600);
  }, 800);
}

init();
