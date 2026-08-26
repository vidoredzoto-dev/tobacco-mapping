# KRB Kutsaga Agricultural Observatory

An extraordinary agricultural web map for Kutsaga Research Board's ADSE department.

## Deploy to Netlify

1. Put ALL your `.geojson` files in the **same folder** as `index.html`
2. Your folder should look like:
```
webmap/
├── index.html
├── netlify.toml
├── dams.geojson
├── Kutsagaresearchstation.geojson
├── land1.geojson
├── land1ab.geojson
├── land2.geojson
├── land3.geojson
├── land4.geojson
├── land5.geojson
├── land6.geojson
├── land7.geojson
├── land8.geojson
├── land9.geojson
├── rivers.geojson
└── roads.geojson
```
3. Go to [netlify.com](https://netlify.com) → **Add new site → Deploy manually**
4. Drag and drop the entire `webmap` folder into the deploy area
5. Done! 🎉

## Features
- 🗺️ Multi-basemap (Satellite / Topo / Dark)
- 🌿 NDVI phenological curves by land cover type
- 🎨 Agricultural colour index with NDVI ranges
- 📊 Land use distribution charts
- 🔲 Layer toggles + opacity control
- 📍 Live coordinate display
- 🖱️ Click any feature for property inspection
- ✨ Hover highlighting with tooltips
