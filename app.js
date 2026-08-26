```javascript
/* ============================================================
   TOBACCO CULTIVATION MAPPING — KRB ADSE
   GeoJSON layers are loaded automatically on startup.
   ============================================================ */

const DATA_PATH = "data/";

/* ------------------------------------------------------------
   MAP INITIALISATION
   ------------------------------------------------------------ */

const map = L.map("map", {
  center: [-17.8252, 31.0335],
  zoom: 9,
  zoomControl: true
});

/* ------------------------------------------------------------
   BASEMAPS
   ------------------------------------------------------------ */

const basemaps = {
  osm: L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 20
    }
  ),

  satellite: L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Tiles &copy; Esri",
      maxZoom: 20
    }
  ),

  terrain: L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenTopoMap contributors",
      maxZoom: 17
    }
  ),

  dark: L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      attribution: "&copy; CARTO",
      maxZoom: 20
    }
  )
};

basemaps.satellite.addTo(map);

/* ------------------------------------------------------------
   GEOJSON CONFIGURATION
   ------------------------------------------------------------ */

const layerConfig = [
  {
    name: "Research Trial",
    file: "Research_trial.geojson",
    color: "#e11d48",
    fillColor: "#fb7185"
  },
  {
    name: "TRB Boundary",
    file: "TRB_Boundary.geojson",
    color: "#7c3aed",
    fillColor: "#a78bfa"
  },
  {
    name: "Dams",
    file: "dams.geojson",
    color: "#0284c7",
    fillColor: "#38bdf8"
  },
  {
    name: "Kutsaga Classification",
    file: "kutsaga_classification.geojson",
    color: "#16a34a",
    fillColor: "#4ade80"
  },
  {
    name: "Land 9",
    file: "land9.geojson",
    color: "#ca8a04",
    fillColor: "#facc15"
  },
  {
    name: "Land 1",
    file: "land_1.geojson",
    color: "#ea580c",
    fillColor: "#fb923c"
  },
  {
    name: "Land 10",
    file: "land_10.geojson",
    color: "#0891b2",
    fillColor: "#22d3ee"
  },
  {
    name: "Land 4",
    file: "land_4.geojson",
    color: "#9333ea",
    fillColor: "#c084fc"
  },
  {
    name: "Land 4A",
    file: "land_4a.geojson",
    color: "#db2777",
    fillColor: "#f472b6"
  },
  {
    name: "Land 9",
    file: "land_9.geojson",
    color: "#65a30d",
    fillColor: "#a3e635"
  },
  {
    name: "Rivers",
    file: "rivers.geojson",
    color: "#2563eb",
    fillColor: "#60a5fa",
    line: true
  },
  {
    name: "Roads",
    file: "roads.geojson",
    color: "#f97316",
    fillColor: "#fdba74",
    line: true
  }
];

/* ------------------------------------------------------------
   GLOBAL VARIABLES
   ------------------------------------------------------------ */

const geojsonLayers = {};
const loadedData = {};
let allLayersGroup = L.featureGroup();

let globalOpacity = 0.75;
let labelsVisible = false;
let selectedClass = null;

/* ------------------------------------------------------------
   UTILITY FUNCTIONS
   ------------------------------------------------------------ */

function setLoading(message) {
  const loading = document.getElementById("loading");
  const messageElement = document.getElementById("loading-msg");

  if (messageElement) {
    messageElement.textContent = message;
  }

  if (loading) {
    loading.style.display = "flex";
  }
}

function hideLoading() {
  const loading = document.getElementById("loading");

  if (loading) {
    loading.style.display = "none";
  }
}

function showError(message) {
  const toast = document.getElementById("error-toast");

  if (toast) {
    toast.textContent = message;
    toast.style.display = "block";

    setTimeout(() => {
      toast.style.display = "none";
    }, 7000);
  }

  console.error(message);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function getFeatureCount() {
  let count = 0;

  Object.values(loadedData).forEach(data => {
    if (data && Array.isArray(data.features)) {
      count += data.features.length;
    }
  });

  return count;
}

/* ------------------------------------------------------------
   FEATURE STYLING
   ------------------------------------------------------------ */

function getStyle(config) {
  if (config.line) {
    return {
      color: config.color,
      weight: config.name === "Rivers" ? 2.5 : 2,
      opacity: 0.9
    };
  }

  return {
    color: config.color,
    weight: 1.5,
    opacity: 0.9,
    fillColor: config.fillColor || config.color,
    fillOpacity: globalOpacity
  };
}

/* ------------------------------------------------------------
   POPUP / INFO PANEL
   ------------------------------------------------------------ */

function showFeatureInfo(feature, layerName) {
  const panel = document.getElementById("info-panel");
  const title = document.getElementById("info-title");
  const body = document.getElementById("info-body");

  if (!panel || !title || !body) return;

  title.textContent = layerName;

  const properties = feature.properties || {};

  let html = "";

  const keys = Object.keys(properties);

  if (keys.length === 0) {
    html = "<p>No attribute information available.</p>";
  } else {
    keys.forEach(key => {
      let value = properties[key];

      if (value === null || value === undefined) {
        value = "—";
      }

      if (typeof value === "object") {
        value = JSON.stringify(value);
      }

      html += `
        <div class="info-row">
          <span class="info-key">${escapeHtml(key)}</span>
          <span class="info-value">${escapeHtml(String(value))}</span>
        </div>
      `;
    });
  }

  body.innerHTML = html;
  panel.style.display = "block";
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ------------------------------------------------------------
   LOAD A SINGLE GEOJSON FILE
   ------------------------------------------------------------ */

async function loadGeoJSON(config) {
  try {
    const response = await fetch(DATA_PATH + config.file);

    if (!response.ok) {
      throw new Error(
        `${config.file}: HTTP ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    loadedData[config.file] = data;

    const layer = L.geoJSON(data, {
      style: () => getStyle(config),

      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 6,
          color: config.color,
          weight: 1.5,
          fillColor: config.fillColor || config.color,
          fillOpacity: globalOpacity
        });
      },

      onEachFeature: function(feature, leafletLayer) {
        leafletLayer.on({
          click: function() {
            showFeatureInfo(feature, config.name);
          },

          mouseover: function(e) {
            const target = e.target;

            if (target.setStyle) {
              target.setStyle({
                weight: 3,
                fillOpacity: Math.min(globalOpacity + 0.15, 1),
                opacity: 1
              });
            }
          },

          mouseout: function(e) {
            const target = e.target;

            if (target.setStyle) {
              target.setStyle(getStyle(config));
            }
          }
        });

        if (labelsVisible) {
          addFeatureLabel(leafletLayer, feature, config);
        }
      }
    });

    geojsonLayers[config.file] = layer;

    /*
     * Add all loaded layers to the map automatically.
     * The user can then turn individual layers off from
     * the sidebar.
     */
    layer.addTo(map);

    allLayersGroup.addLayer(layer);

    addLayerControl(config, layer);

    return {
      success: true,
      config,
      layer,
      data
    };

  } catch (error) {
    console.error(`Failed to load ${config.file}:`, error);

    showError(
      `Could not load ${config.file}. Check that it exists in the data folder.`
    );

    addLayerControl(config, null, true);

    return {
      success: false,
      config,
      error
    };
  }
}

/* ------------------------------------------------------------
   LOAD ALL GEOJSON FILES
   ------------------------------------------------------------ */

async function loadAllLayers() {
  setLoading("Loading GeoJSON layers…");

  const results = await Promise.all(
    layerConfig.map(config => loadGeoJSON(config))
  );

  const successful = results.filter(result => result.success);

  updateStatistics();
  updateFeatureBadge();
  updateClassBreakdown();
  updateLegend();

  if (successful.length > 0) {
    const bounds = allLayersGroup.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30]
      });
    }
  }

  hideLoading();

  if (successful.length === layerConfig.length) {
    console.log("All GeoJSON layers loaded successfully.");
  } else {
    console.warn(
      `${successful.length} of ${layerConfig.length} GeoJSON layers loaded.`
    );
  }
}

/* ------------------------------------------------------------
   SIDEBAR LAYER CONTROLS
   ------------------------------------------------------------ */

function addLayerControl(config, layer, failed = false) {
  const container = document.getElementById("layer-controls");

  if (!container) return;

  const id = "layer-" + config.file
    .replace(/[^a-zA-Z0-9]/g, "-");

  const row = document.createElement("div");

  row.className = "layer-control";

  row.innerHTML = `
    <label for="${id}">
      <input
        type="checkbox"
        id="${id}"
        ${layer ? "checked" : ""}
        ${failed ? "disabled" : ""}
      >

      <span
        class="layer-color"
        style="background:${config.color}"
      ></span>

      <span class="layer-name">
        ${config.name}
      </span>

      ${failed ? '<span class="layer-error">⚠</span>' : ""}
    </label>
  `;

  container.appendChild(row);

  const checkbox = row.querySelector("input");

  if (checkbox && layer) {
    checkbox.addEventListener("change", function() {
      if (this.checked) {
        layer.addTo(map);
      } else {
        map.removeLayer(layer);
      }
    });
  }
}

/* ------------------------------------------------------------
   STATISTICS
   ------------------------------------------------------------ */

function updateStatistics() {
  const total = getFeatureCount();

  const totalElement = document.getElementById("stat-total");

  if (totalElement) {
    totalElement.textContent = formatNumber(total);
  }

  /*
   * Try to calculate tobacco area from common attribute names.
   */

  let tobaccoArea = 0;

  Object.values(loadedData).forEach(data => {
    if (!data || !data.features) return;

    data.features.forEach(feature => {
      const properties = feature.properties || {};

      const classValue =
        properties.class ||
        properties.Class ||
        properties.CLASS ||
        properties.classification ||
        properties.Classification ||
        properties.landcover ||
        properties.LandCover ||
        "";

      const className = String(classValue).toLowerCase();

      if (className.includes("tobacco")) {
        const area =
          properties.area_ha ||
          properties.area_ha ||
          properties.area ||
          properties.Area ||
          0;

        tobaccoArea += Number(area) || 0;
      }
    });
  });

  const tobaccoElement = document.getElementById("stat-tobacco");

  if (tobaccoElement) {
    tobaccoElement.textContent =
      tobaccoArea > 0
        ? tobaccoArea.toFixed(2)
        : "—";
  }
}

function updateFeatureBadge() {
  const badge = document.getElementById("feature-badge");

  if (!badge) return;

  badge.textContent =
    `${formatNumber(getFeatureCount())} Features`;
}

/* ------------------------------------------------------------
   CLASS BREAKDOWN
   ------------------------------------------------------------ */

function updateClassBreakdown() {
  const container = document.getElementById("class-breakdown");

  if (!container) return;

  const classes = {};

  Object.values(loadedData).forEach(data => {
    if (!data || !data.features) return;

    data.features.forEach(feature => {
      const properties = feature.properties || {};

      const classValue =
        properties.class ||
        properties.Class ||
        properties.CLASS ||
        properties.classification ||
        properties.Classification ||
        properties.landcover ||
        properties.LandCover;

      if (classValue !== undefined && classValue !== null) {
        const key = String(classValue);

        classes[key] = (classes[key] || 0) + 1;
      }
    });
  });

  const entries = Object.entries(classes)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No classification attributes found.</div>';

    return;
  }

  container.innerHTML = entries
    .map(([name, count]) => `
      <div class="class-row">
        <span>${escapeHtml(name)}</span>
        <strong>${formatNumber(count)}</strong>
      </div>
    `)
    .join("");
}

/* ------------------------------------------------------------
   LEGEND
   ------------------------------------------------------------ */

function updateLegend() {
  const container = document.getElementById("legend-items");

  if (!container) return;

  container.innerHTML = layerConfig
    .map(config => `
      <div
        class="legend-item"
        data-layer="${escapeHtml(config.file)}"
        title="Click to highlight"
      >
        <span
          class="legend-color"
          style="
            background:${config.fillColor || config.color};
            border-color:${config.color};
          "
        ></span>

        <span>${escapeHtml(config.name)}</span>
      </div>
    `)
    .join("");

  container.querySelectorAll(".legend-item")
    .forEach(item => {
      item.addEventListener("click", function() {
        const file = this.dataset.layer;

        highlightLayer(file);
      });
    });
}

function highlightLayer(file) {
  const targetLayer = geojsonLayers[file];

  if (!targetLayer) return;

  Object.entries(geojsonLayers).forEach(([layerFile, layer]) => {
    if (!layer) return;

    layer.eachLayer(child => {
      if (child.setStyle) {
        const config = layerConfig.find(
          item => item.file === layerFile
        );

        if (!config) return;

        if (layerFile === file) {
          child.setStyle({
            weight: 4,
            color: "#ffffff",
            fillOpacity: 0.9
          });
        } else {
          child.setStyle(getStyle(config));
        }
      }
    });
  });

  const bounds = targetLayer.getBounds();

  if (bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [40, 40]
    });
  }

  selectedClass = file;
}

/* ------------------------------------------------------------
   OPACITY
   ------------------------------------------------------------ */

function updateOpacity(value) {
  globalOpacity = Number(value);

  document.getElementById("opacity-val").textContent =
    `${Math.round(globalOpacity * 100)}%`;

  Object.entries(geojsonLayers).forEach(([file, layer]) => {
    if (!layer) return;

    const config = layerConfig.find(
      item => item.file === file
    );

    if (!config) return;

    layer.eachLayer(child => {
      if (child.setStyle) {
        if (config.line) {
          child.setStyle({
            opacity: globalOpacity
          });
        } else {
          child.setStyle({
            fillOpacity: globalOpacity,
            opacity: globalOpacity
          });
        }
      }
    });
  });
}

/* ------------------------------------------------------------
   LABELS
   ------------------------------------------------------------ */

function getFeatureLabel(feature) {
  const properties = feature.properties || {};

  return (
    properties.name ||
    properties.Name ||
    properties.NAME ||
    properties.class ||
    properties.Class ||
    properties.CLASS ||
    properties.id ||
    properties.ID ||
    ""
  );
}

function addFeatureLabel(layer, feature, config) {
  const label = getFeatureLabel(feature);

  if (!label) return;

  layer.bindTooltip(String(label), {
    permanent: true,
    direction: "center",
    className: "geojson-label"
  });
}

function toggleLabels() {
  labelsVisible = !labelsVisible;

  Object.entries(geojsonLayers).forEach(([file, layer]) => {
    if (!layer) return;

    const config = layerConfig.find(
      item => item.file === file
    );

    layer.eachLayer(child => {
      if (labelsVisible) {
        addFeatureLabel(child, child.feature, config);
      } else if (child.getTooltip()) {
        child.unbindTooltip();
      }
    });
  });

  const button = document.getElementById("label-btn");

  if (button) {
    button.classList.toggle("active", labelsVisible);
  }
}

/* ------------------------------------------------------------
   SEARCH
   ------------------------------------------------------------ */

function searchFeatures(query) {
  const search = query.trim().toLowerCase();

  if (!search) {
    resetHighlighting();
    return;
  }

  Object.entries(geojsonLayers).forEach(([file, layer]) => {
    if (!layer) return;

    layer.eachLayer(child => {
      const feature = child.feature;

      if (!feature) return;

      const properties = feature.properties || {};

      const text = Object.values(properties)
        .join(" ")
        .toLowerCase();

      if (text.includes(search)) {
        if (child.setStyle) {
          child.setStyle({
            color: "#ffffff",
            weight: 4,
            fillOpacity: 1
          });
        }
      } else {
        const config = layerConfig.find(
          item => item.file === file
        );

        if (child.setStyle && config) {
          child.setStyle(getStyle(config));
        }
      }
    });
  });
}

function resetHighlighting() {
  Object.entries(geojsonLayers).forEach(([file, layer]) => {
    if (!layer) return;

    const config = layerConfig.find(
      item => item.file === file
    );

    if (!config) return;

    layer.eachLayer(child => {
      if (child.setStyle) {
        child.setStyle(getStyle(config));
      }
    });
  });
}

/* ------------------------------------------------------------
   EXPORT GEOJSON
   ------------------------------------------------------------ */

function exportGeoJSON() {
  const exportData = {
    type: "FeatureCollection",
    features: []
  };

  Object.values(loadedData).forEach(data => {
    if (!data || !data.features) return;

    data.features.forEach(feature => {
      exportData.features.push(feature);
    });
  });

  const blob = new Blob(
    [JSON.stringify(exportData, null, 2)],
    {
      type: "application/geo+json"
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "KRB_ADSE_all_layers.geojson";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------
   EVENT HANDLERS
   ------------------------------------------------------------ */

/* Basemap buttons */

document.querySelectorAll(".basemap-btn")
  .forEach(button => {
    button.addEventListener("click", function() {

      const basemapName = this.dataset.basemap;

      Object.values(basemaps).forEach(layer => {
        map.removeLayer(layer);
      });

      basemaps[basemapName].addTo(map);

      document.querySelectorAll(".basemap-btn")
        .forEach(btn => btn.classList.remove("active"));

      this.classList.add("active");
    });
  });

/* Opacity */

const opacitySlider =
  document.getElementById("opacity-slider");

if (opacitySlider) {
  opacitySlider.addEventListener("input", function() {
    updateOpacity(this.value);
  });
}

/* Search */

const searchInput =
  document.getElementById("search-input");

if (searchInput) {
  searchInput.addEventListener("input", function() {
    searchFeatures(this.value);
  });
}

/* Zoom all */

const zoomAllButton =
  document.getElementById("btn-zoom-all");

if (zoomAllButton) {
  zoomAllButton.addEventListener("click", function() {

    const bounds = allLayersGroup.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30]
      });
    }
  });
}

/* Labels */

const labelButton =
  document.getElementById("label-btn");

if (labelButton) {
  labelButton.addEventListener("click", toggleLabels);
}

/* Fullscreen */

const fullscreenButton =
  document.getElementById("btn-fullscreen");

if (fullscreenButton) {
  fullscreenButton.addEventListener("click", function() {

    const container =
      document.getElementById("map-container");

    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });
}

/* Export */

const exportButton =
  document.getElementById("btn-export");

if (exportButton) {
  exportButton.addEventListener("click", exportGeoJSON);
}

/* Info close */

const infoClose =
  document.getElementById("info-close");

if (infoClose) {
  infoClose.addEventListener("click", function() {
    document.getElementById("info-panel").style.display =
      "none";
  });
}

/* Sidebar toggle */

const sidebarToggle =
  document.getElementById("sidebar-toggle");

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", function() {

    const sidebar =
      document.getElementById("sidebar");

    sidebar.classList.toggle("collapsed");

    this.textContent =
      sidebar.classList.contains("collapsed")
        ? "▶"
        : "◀";

    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  });
}

/* Map coordinates */

map.on("mousemove", function(e) {
  const latElement =
    document.getElementById("coord-lat");

  const lngElement =
    document.getElementById("coord-lng");

  const zoomElement =
    document.getElementById("coord-zoom");

  if (latElement) {
    latElement.textContent =
      `Lat: ${e.latlng.lat.toFixed(5)}`;
  }

  if (lngElement) {
    lngElement.textContent =
      `Lng: ${e.latlng.lng.toFixed(5)}`;
  }

  if (zoomElement) {
    zoomElement.textContent =
      `Zoom: ${map.getZoom()}`;
  }
});

map.on("zoomend", function() {
  const zoomElement =
    document.getElementById("coord-zoom");

  if (zoomElement) {
    zoomElement.textContent =
      `Zoom: ${map.getZoom()}`;
  }
});

/* ------------------------------------------------------------
   APPLICATION STARTUP
   ------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", function() {
  loadAllLayers();
});
```
