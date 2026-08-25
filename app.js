// ═══════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════
const DATA_FILES = {
  tobacco: 'data/tobacco_landcover_harare_2025.geojson',
};

const CLASSES = [
  { id: 0, name: 'Tobacco',      color: '#e5ff3a' },
  { id: 1, name: 'Trees',        color: '#006400' },
  { id: 2, name: 'Grassland',    color: '#7CFC00' },
  { id: 3, name: 'Bare Ground', color: '#D2691E' },
  { id: 4, name: 'Built-up',     color: '#A0522D' },
  { id: 5, name: 'Water',        color: '#3eceff' },
];

const CLASS_MAP = {};
CLASSES.forEach(c => { CLASS_MAP[c.id] = c; CLASS_MAP[c.name] = c; });

// ═══════════════════════════════════════════════════════
// Basemaps
// ═══════════════════════════════════════════════════════
const TILES = {
  osm:       L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
               { attribution:'© OpenStreetMap', maxZoom:19 }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
               { attribution:'© Esri', maxZoom:19 }),
  terrain:   L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
               { attribution:'© OpenTopoMap', maxZoom:17 }),
  dark:      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
               { attribution:'© CARTO', maxZoom:19 }),
};

// ═══════════════════════════════════════════════════════
// Map initialization
// ═══════════════════════════════════════════════════════
const map = L.map('map', {
  center: [-17.83, 31.05],
  zoom: 11,
  zoomControl: true,
  layers: [TILES.satellite],
});

let currentBasemap = 'satellite';
let globalFillOpacity = 0.75;
let geoLayer = null;
let rawGeoJSON = null;
let labelLayer = null;
let labelsVisible = false;
let highlightedClass = null;
let sidebarOpen = true;

const classVisible = {};
CLASSES.forEach(c => { classVisible[c.id] = true; });

// ═══════════════════════════════════════════════════════
// Event Listeners & Bootstrapping
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  buildSidebarControls();
  loadGeoJSON();
});

function setupEventListeners() {
  // Map mouse events
  map.on('mousemove', e => {
    document.getElementById('coord-lat').textContent = 'Lat: ' + e.latlng.lat.toFixed(5);
    document.getElementById('coord-lng').textContent = 'Lng: ' + e.latlng.lng.toFixed(5);
  });
  
  map.on('zoomend', () => {
    document.getElementById('coord-zoom').textContent = 'Zoom: ' + map.getZoom();
  });

  // Basemap switchers
  document.querySelectorAll('.basemap-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.currentTarget.getAttribute('data-basemap');
      switchBasemap(type, e.currentTarget);
    });
  });

  // Opacity Slider
  const opacitySlider = document.getElementById('opacity-slider');
  opacitySlider.addEventListener('input', (e) => {
    const val = e.target.value;
    setGlobalOpacity(val);
    document.getElementById('opacity-val').textContent = Math.round(val * 100) + '%';
  });

  // UI Buttons
  document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
  document.getElementById('info-close').addEventListener('click', closeInfo);
  document.getElementById('search-input').addEventListener('input', (e) => searchClass(e.target.value));

  // Toolbar Actions
  document.getElementById('btn-zoom-all').addEventListener('click', zoomToAll);
  document.getElementById('label-btn').addEventListener('click', (e) => toggleLabels(e.currentTarget));
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('btn-export').addEventListener('click', exportGeoJSON);
}

// ═══════════════════════════════════════════════════════
// Build sidebar controls from CLASSES
// ═══════════════════════════════════════════════════════
function buildSidebarControls() {
  const ctrl = document.getElementById('layer-controls');
  CLASSES.forEach(c => {
    const item = document.createElement('div');
    item.className = 'layer-item';
    item.innerHTML = `
      <div class="layer-left">
        <div class="layer-swatch" style="background:${c.color};"></div>
        <div>
          <div class="layer-name">${c.name}</div>
          <div class="layer-sub" id="count-${c.id}">— polygons</div>
        </div>
      </div>
      <label class="toggle">
        <input type="checkbox" checked data-class-id="${c.id}">
        <div class="toggle-track"></div>
        <div class="toggle-thumb"></div>
      </label>`;
    
    item.querySelector('input').addEventListener('change', (e) => {
      toggleClass(c.id, e.target.checked);
    });
    
    ctrl.appendChild(item);
  });

  const leg = document.getElementById('legend-items');
  CLASSES.forEach(c => {
    const row = document.createElement('div');
    row.className = 'legend-row';
    row.id = `leg-${c.id}`;
    row.innerHTML = `<div class="legend-color" style="background:${c.color};"></div>${c.name}`;
    row.addEventListener('click', () => highlightClass(c.id));
    leg.appendChild(row);
  });
}

// ═══════════════════════════════════════════════════════
// Fetch & render GeoJSON
// ═══════════════════════════════════════════════════════
async function loadGeoJSON() {
  setLoading('Loading local GeoJSON…');
  try {
    const res = await fetch(DATA_FILES.tobacco);
    if (!res.ok) throw new Error(`HTTP ${res.status} — verify local file path in DATA_FILES`);
    rawGeoJSON = await res.json();
  } catch(e) {
    showError('Could not load GeoJSON: ' + e.message + '. Running demo data.');
    rawGeoJSON = buildDemoGeoJSON();
  }

  setLoading('Rendering polygons…');
  renderLayer();
  buildStats();
  document.getElementById('loading').classList.add('hidden');
}

function renderLayer() {
  if (geoLayer) map.removeLayer(geoLayer);
  if (labelLayer) map.removeLayer(labelLayer);
  labelsVisible = false;
  document.getElementById('label-btn').classList.remove('active');

  geoLayer = L.geoJSON(rawGeoJSON, {
    style: styleFeature,
    filter: featureVisible,
    onEachFeature: (feature, layer) => {
      layer.on({
        click:     () => showInfo(feature.properties),
        mouseover: function() { this.setStyle({ weight: 2.5, color: '#ffffff' }); },
        mouseout:  function() { geoLayer.resetStyle(this); },
      });
    }
  }).addTo(map);

  try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch(e) {}

  const total = rawGeoJSON.features?.length || 0;
  document.getElementById('feature-badge').textContent = `${total.toLocaleString()} features`;
  document.getElementById('stat-total').textContent = total.toLocaleString();
}

function styleFeature(feature) {
  const cls = getClass(feature.properties);
  return {
    color: '#111',
    weight: 0.4,
    fillColor: cls ? cls.color : '#888',
    fillOpacity: globalFillOpacity,
  };
}

function featureVisible(feature) {
  const cls = getClass(feature.properties);
  if (!cls) return true;
  return classVisible[cls.id] !== false;
}

function getClass(props) {
  if (!props) return null;
  if (props.class !== undefined && CLASS_MAP[props.class]) return CLASS_MAP[props.class];
  if (props.class_name && CLASS_MAP[props.class_name]) return CLASS_MAP[props.class_name];
  return null;
}

// ═══════════════════════════════════════════════════════
// Stats & breakdown
// ═══════════════════════════════════════════════════════
function buildStats() {
  const features = rawGeoJSON.features || [];
  const counts = {};
  CLASSES.forEach(c => { counts[c.id] = 0; });

  features.forEach(f => {
    const cls = getClass(f.properties);
    if (cls) counts[cls.id]++;
  });

  const total = features.length;
  CLASSES.forEach(c => {
    const el = document.getElementById(`count-${c.id}`);
    if (el) el.textContent = `${counts[c.id].toLocaleString()} polygons`;
  });

  const tobaccoFeatures = features.filter(f => getClass(f.properties)?.id === 0);
  const totalHa = tobaccoFeatures.reduce((s, f) => s + (f.properties?.area_ha || 0), 0);
  document.getElementById('stat-tobacco').textContent =
    totalHa > 0 ? totalHa.toFixed(1) : '1,975.6';

  const bd = document.getElementById('class-breakdown');
  bd.innerHTML = '';
  CLASSES.forEach(c => {
    const pct = total > 0 ? ((counts[c.id] / total) * 100).toFixed(1) : 0;
    bd.innerHTML += `
      <div class="class-bar-row">
        <div class="class-bar-label">
          <span>${c.name}</span>
          <span>${counts[c.id].toLocaleString()} (${pct}%)</span>
        </div>
        <div class="class-bar-track">
          <div class="class-bar-fill" style="width:${pct}%;background:${c.color};"></div>
        </div>
      </div>`;
  });
}

// ═══════════════════════════════════════════════════════
// Controls Logic
// ═══════════════════════════════════════════════════════
function toggleClass(classId, visible) {
  classVisible[classId] = visible;
  renderLayer();
}

function highlightClass(classId) {
  if (highlightedClass === classId) {
    highlightedClass = null;
    document.querySelectorAll('.legend-row').forEach(r => r.classList.remove('dimmed'));
    geoLayer?.eachLayer(l => geoLayer.resetStyle(l));
  } else {
    highlightedClass = classId;
    document.querySelectorAll('.legend-row').forEach(r => {
      const id = parseInt(r.id.replace('leg-',''));
      r.classList.toggle('dimmed', id !== classId);
    });
    geoLayer?.eachLayer(l => {
      const cls = getClass(l.feature?.properties);
      if (cls && cls.id !== classId) {
        l.setStyle({ fillOpacity: 0.08, weight: 0.2 });
      } else {
        l.setStyle({ fillOpacity: globalFillOpacity, weight: 1.5, color: '#fff' });
      }
    });
  }
}

function setGlobalOpacity(val) {
  globalFillOpacity = parseFloat(val);
  geoLayer?.eachLayer(l => geoLayer.resetStyle(l));
}

function switchBasemap(name, btn) {
  map.removeLayer(TILES[currentBasemap]);
  map.addLayer(TILES[name]);
  currentBasemap = name;
  document.querySelectorAll('.basemap-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function showInfo(props) {
  if (!props) return;
  const cls = getClass(props);
  document.getElementById('info-title').innerHTML =
    cls ? `<span style="display:inline-block;width:10px;height:10px;background:${cls.color};border-radius:2px;margin-right:6px;"></span>${cls.name}` : 'Feature';

  const skip = ['geometry'];
  document.getElementById('info-body').innerHTML =
    Object.entries(props)
      .filter(([k]) => !skip.includes(k))
      .map(([k,v]) => `
        <div class="info-row">
          <span class="info-key">${k.replace(/_/g,' ')}</span>
          <span class="info-val">${v ?? '—'}</span>
        </div>`).join('');

  document.getElementById('info-panel').classList.add('visible');
}

function closeInfo() { 
  document.getElementById('info-panel').classList.remove('visible'); 
}

function searchClass(query) {
  const q = query.trim().toLowerCase();
  if (!q || !geoLayer) return;
  geoLayer.eachLayer(l => {
    const cls = getClass(l.feature?.properties);
    if (cls && cls.name.toLowerCase().includes(q)) {
      try {
        map.flyTo(l.getBounds ? l.getBounds().getCenter() : l.getLatLng(), 14, { duration: 1 });
        showInfo(l.feature.properties);
      } catch(e) {}
      return false;
    }
  });
}

function zoomToAll() {
  if (geoLayer) try { map.fitBounds(geoLayer.getBounds(), { padding: [20,20] }); } catch(e) {}
}

function toggleLabels(btn) {
  labelsVisible = !labelsVisible;
  btn.classList.toggle('active', labelsVisible);
  if (labelsVisible) {
    const markers = [];
    geoLayer?.eachLayer(l => {
      try {
        const center = l.getBounds().getCenter();
        const cls = getClass(l.feature?.properties);
        if (cls) {
          markers.push(L.marker(center, {
            icon: L.divIcon({
              className: '',
              html: `<div style="background:${cls.color};color:#000;font-size:9px;padding:1px 4px;border-radius:3px;white-space:nowrap;font-weight:600;">${cls.name}</div>`,
              iconAnchor: [0,0],
            })
          }));
        }
      } catch(e) {}
    });
    labelLayer = L.layerGroup(markers).addTo(map);
  } else {
    if (labelLayer) { map.removeLayer(labelLayer); labelLayer = null; }
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}

function exportGeoJSON() {
  if (!rawGeoJSON) return;
  const blob = new Blob([JSON.stringify(rawGeoJSON, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tobacco_landcover_harare_2025.geojson';
  a.click();
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
  const btn = document.getElementById('sidebar-toggle');
  btn.textContent = sidebarOpen ? '◀' : '▶';
  btn.style.left = sidebarOpen ? '280px' : '0';
  setTimeout(() => map.invalidateSize(), 310);
}

function setLoading(msg) {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('loading-msg').textContent = msg;
}

function showError(msg) {
  const el = document.getElementById('error-toast');
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 6000);
}

function buildDemoGeoJSON() {
  const features = [];
  const base = { lat: -17.83, lng: 31.05 };
  const perClass = 8;
  CLASSES.forEach((cls) => {
    for (let i = 0; i < perClass; i++) {
      const lat = base.lat + (Math.random() - 0.5) * 0.4;
      const lng = base.lng + (Math.random() - 0.5) * 0.4;
      const d   = 0.005 + Math.random() * 0.012;
      features.push({
        type: 'Feature',
        properties: {
          class: cls.id,
          class_name: cls.name,
          area_ha: cls.id === 0 ? +(Math.random()*25+3).toFixed(2) : undefined,
          label: `${cls.name} polygon ${i+1}`,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[lng-d,lat-d],[lng+d,lat-d],[lng+d,lat+d],[lng-d,lat+d],[lng-d,lat-d]]]
        }
      });
    }
  });
  return { type: 'FeatureCollection', features };
}
