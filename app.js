/* ============================================================
   KRB · KUTSAGA AGRICULTURAL OBSERVATORY
   Main Application JavaScript
   ============================================================ */

'use strict';

/* ============================================================
   CONFIGURATION
   ============================================================ */

const LAYERS_CONFIG = {

  dams: {
    file: 'dams.geojson',
    color: '#3a7ebf',
    weight: 2,
    fillOpacity: 0.5,
    label: 'Dams & Water'
  },

  rivers: {
    file: 'rivers.geojson',
    color: '#5ba3d4',
    weight: 2,
    fillOpacity: 0.4,
    label: 'Rivers'
  },

  roads: {
    file: 'roads.geojson',
    color: '#d4c49a',
    weight: 2.5,
    fillOpacity: 0,
    label: 'Roads'
  },

  station: {
    file: 'Kutsagaresearchstation.geojson',
    color: '#c8932a',
    weight: 2,
    fillOpacity: 0.25,
    label: 'Research Station'
  },

  land1ab: {
    file: 'land1ab.geojson',
    color: '#c8932a',
    weight: 1.5,
    fillOpacity: 0.5,
    label: 'Land 1ab'
  },

  land1: {
    file: 'land1.geojson',
    color: '#a67c2e',
    weight: 1.5,
    fillOpacity: 0.5,
    label: 'Land 1'
  },

  land2: {
    file: 'land2.geojson',
    color: '#6db85c',
    weight: 1.5,
    fillOpacity: 0.5,
    label: 'Land 2'
  },

  land3: {
    file: 'land3.geojson',
    color: '#4a7c3f',
    weight: 1.5,
    fillOpacity: 0.5,
    label: 'Land 3'
  },

  land4: {
    file: 'land4.geojson',
    color: '#8bc34a',
    weight: 1.5,
    fillOpacity: 0.5,
    label: 'Land 4'
  },

  land5: {
    file: 'land5.geojson',
    color: '#cddc39',
    weight: 1.5,
    fillOpacity: 0.5,
    label: 'Land 5'
  },

  land6: {
    file: 'land6.geojson',
    color: '#9e9d24',
    weight: 1.5,
    fillOpacity: 0.5,
    label: 'Land 6'
  },

  land7: {
    file: 'land7.geojson',
    color: '#f9a825',
    weight: 1.5,
    fillOpacity: 0.5,
    label: 'Land 7'
  },

  land8: {
    file: 'land8.geojson',
    color: '#e57c0f',
    weight: 1.5,
    fillOpacity: 0.5,
    label: 'Land 8'
  },

  land9: {
    file: 'land9.geojson',
    color: '#d84315',
    weight: 1.5,
    fillOpacity: 0.5,
    label: 'Land 9'
  }
};


/* ============================================================
   GLOBAL STATE
   ============================================================ */

let map = null;

const layers = {};

let currentOpacity = 0.8;
let activeBasemap = 'satellite';

let ndviChartInstance = null;
let ndviBarInstance = null;
let landUseChartInstance = null;


/* ============================================================
   LAND LAYER KEYS
   ============================================================ */

const LAND_KEYS = [
  'land1ab',
  'land1',
  'land2',
  'land3',
  'land4',
  'land5',
  'land6',
  'land7',
  'land8',
  'land9'
];


/* ============================================================
   BASEMAPS
   ============================================================ */

const BASEMAPS = {

  satellite: L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: '© Esri — Satellite Imagery',
      maxZoom: 19
    }
  ),

  topo: L.tileLayer(
    'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    {
      attribution: '© OpenTopoMap',
      maxZoom: 17
    }
  ),

  dark: L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
      attribution: '© CartoDB Dark',
      maxZoom: 19
    }
  )
};


/* ============================================================
   MAP INITIALISATION
   ============================================================ */

function initializeMap() {

  if (typeof L === 'undefined') {
    console.error('Leaflet has not loaded.');
    return;
  }

  map = L.map('map', {
    center: [-17.75, 31.00],
    zoom: 14,
    zoomControl: true,
    layers: [BASEMAPS.satellite]
  });

  activeBasemap = 'satellite';

  initializeCoordinateTracker();

  console.log('KRB Observatory map initialized.');
}


/* ============================================================
   COORDINATE TRACKER
   ============================================================ */

function initializeCoordinateTracker() {

  if (!map) return;

  map.on('mousemove', function (event) {

    const lat = event.latlng.lat.toFixed(6);
    const lon = event.latlng.lng.toFixed(6);

    const coordinateText =
      `Lat ${lat} · Lon ${lon}`;

    const coordBar =
      document.getElementById('coord-bar');

    const coordInfo =
      document.getElementById('coord-info');

    if (coordBar) {
      coordBar.textContent = coordinateText;
    }

    if (coordInfo) {
      coordInfo.textContent = coordinateText;
    }
  });

  map.on('zoomend', function () {

    const zoom = map.getZoom();

    const coordBar =
      document.getElementById('coord-bar');

    if (coordBar && map._lastMouseEvent) {
      const lat = map._lastMouseEvent.latlng.lat.toFixed(6);
      const lon = map._lastMouseEvent.latlng.lng.toFixed(6);

      coordBar.textContent =
        `Lat ${lat} · Lon ${lon} · Z${zoom}`;
    }
  });
}


/* ============================================================
   HTML ESCAPING
   ============================================================ */

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* ============================================================
   LOAD GEOJSON LAYER
   ============================================================ */

async function loadLayer(key) {

  const cfg = LAYERS_CONFIG[key];

  if (!cfg) {
    console.warn(`Unknown layer: ${key}`);
    return null;
  }

  try {

    const response = await fetch(cfg.file);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} — ${response.statusText}`
      );
    }

    const geojson = await response.json();

    const layer = L.geoJSON(geojson, {

      style: function () {

        return {
          color: cfg.color,
          weight: cfg.weight,
          fillColor: cfg.color,
          fillOpacity:
            cfg.fillOpacity * currentOpacity,
          opacity: 1
        };
      },

      onEachFeature: function (feature, leafletLayer) {

        setupFeatureEvents(
          key,
          feature,
          leafletLayer,
          cfg
        );
      }
    });

    layers[key] = layer;

    layer.addTo(map);

    console.log(
      `Loaded layer: ${cfg.label}`
    );

    updateFeatureCount();

    return layer;

  } catch (error) {

    console.warn(
      `Could not load ${cfg.file}:`,
      error
    );

    layers[key] = null;

    showLayerError(cfg);

    return null;
  }
}


/* ============================================================
   FEATURE EVENTS
   ============================================================ */

function setupFeatureEvents(
  key,
  feature,
  leafletLayer,
  cfg
) {

  /* ----------------------------------------------------------
     CLICK
     ---------------------------------------------------------- */

  leafletLayer.on('click', function () {

    showFeatureInfo(
      key,
      feature,
      cfg,
      leafletLayer
    );
  });


  /* ----------------------------------------------------------
     MOUSEOVER
     ---------------------------------------------------------- */

  leafletLayer.on('mouseover', function () {

    this.setStyle({

      weight: cfg.weight + 1.5,

      fillOpacity: Math.min(
        cfg.fillOpacity * currentOpacity + 0.2,
        0.9
      )
    });

    if (this.bringToFront) {
      this.bringToFront();
    }
  });


  /* ----------------------------------------------------------
     MOUSEOUT
     ---------------------------------------------------------- */

  leafletLayer.on('mouseout', function () {

    if (layers[key]) {
      layers[key].resetStyle(this);
    }
  });


  /* ----------------------------------------------------------
     TOOLTIP
     ---------------------------------------------------------- */

  if (
    feature &&
    feature.properties &&
    Object.keys(feature.properties).length
  ) {

    const properties = feature.properties;

    const name =
      properties.Name ||
      properties.name ||
      properties.ID ||
      properties.id ||
      cfg.label;

    leafletLayer.bindTooltip(

      `
      <div
        style="
          font-family:'Space Mono',monospace;
          font-size:10px;
          background:#1a1208;
          color:#c8932a;
          padding:4px 8px;
          border-radius:4px;
          border:1px solid rgba(200,147,42,0.3);
        "
      >
        ${escapeHTML(name)}
      </div>
      `,

      {
        sticky: true,
        opacity: 1,
        className: 'custom-tooltip'
      }
    );
  }
}


/* ============================================================
   FEATURE INFORMATION
   ============================================================ */

function showFeatureInfo(
  key,
  feature,
  cfg,
  leafletLayer
) {

  const properties =
    feature.properties || {};

  const entries =
    Object.entries(properties)
      .filter(([propertyName]) => {

        return ![
          'geometry',
          'type'
        ].includes(propertyName);

      });


  /* ----------------------------------------------------------
     POPUP
     ---------------------------------------------------------- */

  let popupHTML =
    `<div class="custom-popup">`;

  popupHTML +=
    `<h3>${escapeHTML(cfg.label)}</h3>`;

  if (!entries.length) {

    popupHTML += `
      <p style="
        color:#a89060;
        font-size:11px;
      ">
        No attributes available.
      </p>
    `;

  } else {

    popupHTML += '<table>';

    entries.forEach(
      ([propertyName, value]) => {

        popupHTML += `
          <tr>
            <td>
              ${escapeHTML(propertyName)}
            </td>

            <td style="color:#f0e8d0">
              ${escapeHTML(
                value == null
                  ? '—'
                  : String(value)
              )}
            </td>
          </tr>
        `;
      }
    );

    popupHTML += '</table>';
  }

  popupHTML += '</div>';


  /* ----------------------------------------------------------
     OPEN LEAFLET POPUP
     ---------------------------------------------------------- */

  if (leafletLayer) {

    leafletLayer
      .bindPopup(popupHTML)
      .openPopup();
  }


  /* ----------------------------------------------------------
     SIDEBAR INFO
     ---------------------------------------------------------- */

  const panel =
    document.getElementById(
      'feature-info'
    );

  if (panel) {

    panel.className =
      'info-panel has-data';

    let sidebarHTML = `

      <div class="info-key">
        Layer
      </div>

      <div class="info-val">
        ${escapeHTML(cfg.label)}
      </div>
    `;

    entries.forEach(
      ([propertyName, value]) => {

        sidebarHTML += `

          <div class="info-key">
            ${escapeHTML(propertyName)}
          </div>

          <div class="info-val">
            ${escapeHTML(
              value == null
                ? '—'
                : String(value)
            )}
          </div>
        `;
      }
    );

    panel.innerHTML =
      sidebarHTML;
  }


  /* ----------------------------------------------------------
     SWITCH TO INFO TAB
     ---------------------------------------------------------- */

  const buttons =
    document.querySelectorAll('.tab-btn');

  if (buttons.length >= 4) {

    switchTab(
      'info',
      buttons[3]
    );
  }
}


/* ============================================================
   TAB SWITCHING
   ============================================================ */

function switchTab(
  name,
  button
) {

  document
    .querySelectorAll('.tab-btn')
    .forEach(function (btn) {

      btn.classList.remove('active');
    });


  document
    .querySelectorAll('.tab-content')
    .forEach(function (tab) {

      tab.classList.remove('active');
    });


  if (button) {
    button.classList.add('active');
  }


  const selectedTab =
    document.getElementById(
      `tab-${name}`
    );

  if (selectedTab) {
    selectedTab.classList.add('active');
  }


  /*
   * Chart.js sometimes needs a resize after
   * its parent becomes visible.
   */

  setTimeout(function () {

    if (map) {
      map.invalidateSize();
    }

    if (ndviChartInstance) {
      ndviChartInstance.resize();
    }

    if (ndviBarInstance) {
      ndviBarInstance.resize();
    }

    if (landUseChartInstance) {
      landUseChartInstance.resize();
    }

  }, 100);
}


/* ============================================================
   TOGGLE LAYER
   ============================================================ */

function toggleLayer(
  key,
  element
) {

  const layer =
    layers[key];

  const toggle =
    document.getElementById(
      `toggle-${key}`
    );


  if (!layer) {

    console.warn(
      `Layer "${key}" is not available.`
    );

    return;
  }


  if (map.hasLayer(layer)) {

    map.removeLayer(layer);

    if (toggle) {
      toggle.classList.remove('on');
    }

    if (element) {
      element.classList.remove(
        'active-layer'
      );
    }

  } else {

    layer.addTo(map);

    if (toggle) {
      toggle.classList.add('on');
    }

    if (element) {
      element.classList.add(
        'active-layer'
      );
    }
  }
}


/* ============================================================
   BASEMAP SWITCHER
   ============================================================ */

function setBasemap(
  name,
  button
) {

  if (!BASEMAPS[name]) {

    console.warn(
      `Unknown basemap: ${name}`
    );

    return;
  }


  document
    .querySelectorAll('.bm-btn')
    .forEach(function (btn) {

      btn.classList.remove(
        'active'
      );
    });


  if (button) {
    button.classList.add('active');
  }


  Object.values(BASEMAPS)
    .forEach(function (basemap) {

      if (
        map &&
        map.hasLayer(basemap)
      ) {

        map.removeLayer(
          basemap
        );
      }
    });


  BASEMAPS[name].addTo(map);

  activeBasemap = name;


  setTimeout(function () {

    if (map) {
      map.invalidateSize();
    }

  }, 100);
}


/* ============================================================
   OPACITY CONTROL
   ============================================================ */

function setOpacity(value) {

  currentOpacity =
    Number(value) / 100;


  const opacityValue =
    document.getElementById(
      'opacity-val'
    );

  if (opacityValue) {

    opacityValue.textContent =
      `${value}%`;
  }


  LAND_KEYS.forEach(
    function (key) {

      const layer =
        layers[key];

      if (!layer) return;

      const cfg =
        LAYERS_CONFIG[key];

      layer.setStyle({

        fillOpacity:
          cfg.fillOpacity *
          currentOpacity
      });
    }
  );
}


/* ============================================================
   AUTO FIT ALL LAYERS
   ============================================================ */

function fitMapToLayers() {

  if (!map) return;


  const bounds =
    L.latLngBounds();


  Object.values(layers)
    .forEach(function (layer) {

      if (!layer) return;

      try {

        bounds.extend(
          layer.getBounds()
        );

      } catch (error) {

        console.warn(
          'Could not read layer bounds:',
          error
        );
      }
    });


  if (bounds.isValid()) {

    map.fitBounds(
      bounds,
      {
        padding: [
          50,
          50
        ]
      }
    );
  }
}


/* ============================================================
   FEATURE COUNT
   ============================================================ */

function updateFeatureCount() {

  let total =
    0;

  Object.values(layers)
    .forEach(function (layer) {

      if (!layer) return;

      layer.eachLayer(
        function () {
          total++;
        }
      );
    });


  const totalElement =
    document.getElementById(
      'stat-total'
    );

  if (totalElement) {

    totalElement.textContent =
      total.toLocaleString();
  }


  const badge =
    document.querySelector(
      '.season-badge'
    );

  if (badge && total > 0) {

    badge.title =
      `${total} mapped features`;
  }
}


/* ============================================================
   LAYER ERROR MESSAGE
   ============================================================ */

function showLayerError(cfg) {

  const info =
    document.getElementById(
      'feature-info'
    );

  if (!info) return;

  /*
   * Do not replace the initial information panel
   * for every missing file. Errors are logged to console.
   */
}


/* ============================================================
   NDVI CHART HELPERS
   ============================================================ */

function chartCommonOptions() {

  return {

    responsive: true,

    maintainAspectRatio: false,

    interaction: {
      mode: 'index',
      intersect: false
    },

    plugins: {

      legend: {

        labels: {

          color: '#a89060',

          font: {
            family: 'Space Mono',
            size: 9
          },

          boxWidth: 12,
          padding: 8
        }
      },

      tooltip: {

        backgroundColor:
          'rgba(26,18,8,0.95)',

        titleColor:
          '#c8932a',

        bodyColor:
          '#f0e8d0',

        borderColor:
          'rgba(200,147,42,0.3)',

        borderWidth: 1,

        titleFont: {
          family: 'Space Mono',
          size: 10
        },

        bodyFont: {
          family: 'Space Mono',
          size: 10
        }
      }
    }
  };
}


/* ============================================================
   NDVI PHENOLOGICAL CURVE
   ============================================================ */

function buildNDVIChart() {

  const canvas =
    document.getElementById(
      'ndviChart'
    );

  if (!canvas) return;


  const context =
    canvas.getContext('2d');


  const months = [
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul'
  ];


  ndviChartInstance =
    new Chart(context, {

      type: 'line',

      data: {

        labels: months,

        datasets: [

          {
            label: 'Tobacco',

            data: [
              0.21,
              0.24,
              0.35,
              0.52,
              0.63,
              0.70,
              0.73,
              0.65,
              0.48,
              0.32,
              0.24,
              0.21
            ],

            borderColor:
              '#c8932a',

            backgroundColor:
              'rgba(200,147,42,0.12)',

            fill: true,

            tension: 0.4,

            borderWidth: 2.5,

            pointRadius: 3,

            pointBackgroundColor:
              '#c8932a'
          },

          {
            label: 'Maize',

            data: [
              0.18,
              0.22,
              0.40,
              0.58,
              0.72,
              0.78,
              0.75,
              0.60,
              0.38,
              0.24,
              0.19,
              0.18
            ],

            borderColor:
              '#6db85c',

            backgroundColor:
              'rgba(109,184,92,0.10)',

            fill: true,

            tension: 0.4,

            borderWidth: 2.5,

            pointRadius: 3,

            pointBackgroundColor:
              '#6db85c'
          },

          {
            label: 'Pasture',

            data: [
              0.28,
              0.31,
              0.38,
              0.45,
              0.50,
              0.52,
              0.51,
              0.48,
              0.43,
              0.37,
              0.31,
              0.28
            ],

            borderColor:
              '#8bc34a',

            backgroundColor:
              'rgba(139,195,74,0.08)',

            fill: true,

            tension: 0.4,

            borderWidth: 2,

            pointRadius: 3,

            pointBackgroundColor:
              '#8bc34a',

            borderDash: [
              4,
              3
            ]
          },

          {
            label: 'Woodland',

            data: [
              0.55,
              0.57,
              0.60,
              0.63,
              0.67,
              0.68,
              0.69,
              0.68,
              0.65,
              0.62,
              0.58,
              0.55
            ],

            borderColor:
              '#1e7a1e',

            backgroundColor:
              'rgba(30,122,30,0.08)',

            fill: true,

            tension: 0.4,

            borderWidth: 2,

            pointRadius: 3,

            pointBackgroundColor:
              '#1e7a1e',

            borderDash: [
              6,
              3
            ]
          }
        ]
      },

      options: {

        ...chartCommonOptions(),

        scales: {

          x: {

            ticks: {
              color: '#a89060',
              font: {
                family: 'Space Mono',
                size: 9
              }
            },

            grid: {
              color:
                'rgba(200,147,42,0.08)'
            }
          },

          y: {

            min: 0,
            max: 1,

            ticks: {

              color: '#a89060',

              font: {
                family: 'Space Mono',
                size: 9
              },

              stepSize: 0.2
            },

            grid: {
              color:
                'rgba(200,147,42,0.08)'
            },

            title: {

              display: true,

              text: 'NDVI',

              color: '#a89060',

              font: {
                family: 'Space Mono',
                size: 9
              }
            }
          }
        }
      }
    });
}


/* ============================================================
   NDVI BAR CHART
   ============================================================ */

function buildNDVIBarChart() {

  const canvas =
    document.getElementById(
      'ndviBar'
    );

  if (!canvas) return;


  const context =
    canvas.getContext('2d');


  ndviBarInstance =
    new Chart(context, {

      type: 'bar',

      data: {

        labels: [
          'L1ab',
          'L1',
          'L2',
          'L3',
          'L4',
          'L5',
          'L6',
          'L7',
          'L8',
          'L9'
        ],

        datasets: [

          {
            label: 'Mean NDVI',

            data: [
              0.64,
              0.58,
              0.52,
              0.47,
              0.55,
              0.43,
              0.39,
              0.61,
              0.35,
              0.50
            ],

            backgroundColor: [
              '#c8932a',
              '#a67c2e',
              '#6db85c',
              '#4a7c3f',
              '#8bc34a',
              '#cddc39',
              '#9e9d24',
              '#f9a825',
              '#e57c0f',
              '#d84315'
            ],

            borderRadius: 4,

            borderWidth: 0
          }
        ]
      },

      options: {

        ...chartCommonOptions(),

        plugins: {

          ...chartCommonOptions().plugins,

          legend: {
            display: false
          }
        },

        scales: {

          x: {

            ticks: {

              color: '#a89060',

              font: {
                family: 'Space Mono',
                size: 9
              }
            },

            grid: {
              display: false
            }
          },

          y: {

            min: 0,
            max: 1,

            ticks: {

              color: '#a89060',

              font: {
                family: 'Space Mono',
                size: 9
              },

              stepSize: 0.2
            },

            grid: {

              color:
                'rgba(200,147,42,0.08)'
            }
          }
        }
      }
    });
}


/* ============================================================
   LAND USE CHART
   ============================================================ */

function buildLandUseChart() {

  const canvas =
    document.getElementById(
      'landUseChart'
    );

  if (!canvas) return;


  const context =
    canvas.getContext('2d');


  landUseChartInstance =
    new Chart(context, {

      type: 'bar',

      data: {

        labels: [
          'Tobacco',
          'Maize',
          'Pasture',
          'Woodland',
          'Water',
          'Bare Soil'
        ],

        datasets: [

          {
            label: 'Area (ha)',

            data: [
              140,
              85,
              60,
              45,
              18,
              22
            ],

            backgroundColor: [
              '#c8932a',
              '#6db85c',
              '#8bc34a',
              '#1e7a1e',
              '#3a7ebf',
              '#d84315'
            ],

            borderRadius: 4,

            borderWidth: 0
          }
        ]
      },

      options: {

        indexAxis: 'y',

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

          legend: {
            display: false
          },

          tooltip: {

            backgroundColor:
              'rgba(26,18,8,0.95)',

            titleColor:
              '#c8932a',

            bodyColor:
              '#f0e8d0',

            borderColor:
              'rgba(200,147,42,0.3)',

            borderWidth: 1,

            titleFont: {
              family: 'Space Mono',
              size: 10
            },

            bodyFont: {
              family: 'Space Mono',
              size: 10
            },

            callbacks: {

              label: function (context) {

                return `  ${context.parsed.x} ha`;
              }
            }
          }
        },

        scales: {

          x: {

            ticks: {

              color: '#a89060',

              font: {
                family: 'Space Mono',
                size: 9
              }
            },

            grid: {

              color:
                'rgba(200,147,42,0.08)'
            }
          },

          y: {

            ticks: {

              color: '#a89060',

              font: {
                family: 'Space Mono',
                size: 9
              }
            },

            grid: {
              display: false
            }
          }
        }
      }
    });
}


/* ============================================================
   BUILD ALL CHARTS
   ============================================================ */

function buildCharts() {

  if (typeof Chart === 'undefined') {

    console.error(
      'Chart.js is not loaded.'
    );

    return;
  }

  buildNDVIChart();

  buildNDVIBarChart();

  buildLandUseChart();
}


/* ============================================================
   INITIALISE ALL GEOJSON
   ============================================================ */

async function loadAllLayers() {

  const keys =
    Object.keys(
      LAYERS_CONFIG
    );


  const results =
    await Promise.allSettled(

      keys.map(
        function (key) {
          return loadLayer(key);
        }
      )
    );


  const successful =
    results.filter(
      result =>
        result.status === 'fulfilled' &&
        result.value
    ).length;


  console.log(
    `Loaded ${successful}/${keys.length} map layers.`
  );


  return results;
}


/* ============================================================
   LOADING SCREEN
   ============================================================ */

function hideLoader() {

  const loader =
    document.getElementById(
      'loader'
    );

  if (!loader) return;


  loader.classList.add(
    'hidden'
  );


  setTimeout(
    function () {

      if (loader.parentNode) {
        loader.remove();
      }

    },
    600
  );
}


/* ============================================================
   APPLICATION BOOT
   ============================================================ */

async function init() {

  console.log(
    'Starting KRB Agricultural Observatory...'
  );


  /* Initialise map first */

  initializeMap();


  /* Build charts */

  buildCharts();


  /* Load GeoJSON */

  await loadAllLayers();


  /* Fit to available data */

  fitMapToLayers();


  /* Update statistics */

  updateFeatureCount();


  /* Hide loading screen */

  setTimeout(
    hideLoader,
    500
  );


  console.log(
    'KRB Agricultural Observatory ready.'
  );
}


/* ============================================================
   GLOBAL EVENT HANDLERS
   ============================================================ */

document.addEventListener(
  'DOMContentLoaded',
  function () {

    init();
  }
);


/* ============================================================
   EXPOSE FUNCTIONS
   ============================================================

   Your existing HTML uses inline onclick handlers, e.g.

   onclick="switchTab('layers',this)"
   onclick="toggleLayer('dams',this)"
   onclick="setBasemap('satellite',this)"
   onclick="setOpacity(this.value)"

   Functions declared at top-level are normally available
   to inline handlers, but explicitly exposing them makes
   the behaviour reliable even if this file is later changed
   to a module.
   ============================================================ */

window.switchTab =
  switchTab;

window.toggleLayer =
  toggleLayer;

window.setBasemap =
  setBasemap;

window.setOpacity =
  setOpacity;

window.fitMapToLayers =
  fitMapToLayers;

window.showFeatureInfo =
  showFeatureInfo;
