# TrendyPlanets workspace

TrendyPlanets is now a full-screen location-analysis workspace:

- click a 2D map;
- fetch a real NASA POWER meteorology time series for that coordinate;
- inspect the immediate signal on the right;
- open one advanced drawer for charts and trend values.

It deliberately refuses to invent a construction-success percentage. NASA
meteorology by itself cannot establish whether a dam, building, or any other
project is feasible. A percentage becomes possible only after a documented,
validated model is trained or calibrated against relevant local outcomes and
site variables.

## Run

~~~powershell
npm install
npm run dev
~~~

Open the local URL Vite prints, normally http://localhost:5173.

## Live data already wired in

Every map click calls NASA POWER’s public monthly-and-annual Point API with
2015–2024 values for:

- T2M: 2 m air temperature;
- PRECTOTCORR: precipitation rate;
- RH2M: 2 m relative humidity;
- WS2M: 2 m wind speed.

No NASA token is required for this layer. NASA documents the
[monthly-and-annual API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
and its [OpenAPI specification](https://power.larc.nasa.gov/api/temporal/monthly/openapi.json).
Meteorology in POWER is derived from MERRA-2; use it as gridded climate
context, not a parcel-level survey.

## Data you need for a real project-suitability model

Put original downloads outside the browser bundle in the folders below. Do not
place large GeoTIFF, NetCDF, or HDF files in public or src; Vite would try to
serve them directly and they do not belong in a client-side app.

| What it answers | Download from | Save original data in | Create for the app |
| --- | --- | --- | --- |
| Urban / land-surface heat | [NASA MODIS / VIIRS monthly LST](https://www.earthdata.nasa.gov/data/catalog/lpdaac-ecs-leolstcmg30-002) | data/raw/&lt;city&gt;/lst/ | annual or seasonal summary in data/processed/&lt;city&gt;/ |
| Rainfall intensity and timing | [GPM IMERG Final Precipitation V07](https://search.earthdata.nasa.gov/search?q=GPM_3IMERGM_07) | data/raw/&lt;city&gt;/precipitation/ | daily, monthly, and extreme-rain indicators |
| Regional water-storage change | [JPL GRACE / GRACE-FO Mascon](https://search.earthdata.nasa.gov/search?fpj=GRACE-FO&q=JPL%20CRI) | data/raw/&lt;region&gt;/water-storage/ | regional anomaly and uncertainty summary |
| Elevation and terrain | [NASA Earthdata Search for SRTM](https://search.earthdata.nasa.gov/search?q=SRTM) | data/raw/&lt;city&gt;/terrain/ | slope, drainage path, and elevation derivatives |
| Vegetation / land-cover change | [NASA Earthdata Search for MODIS vegetation indices](https://search.earthdata.nasa.gov/search?q=MODIS%20vegetation%20indices) | data/raw/&lt;city&gt;/vegetation/ | seasonal NDVI/EVI and land-cover change indicators |
| Engineering validity | local survey, authority, and licensed professional sources | data/raw/&lt;city&gt;/site-surveys/ | a reviewed, traceable feature set only |

Many Earthdata downloads require a free Earthdata Login. Preserve each product
name, collection/version, time range, coordinate reference system, spatial
subset, units, quality flags, missing-data rule, and processing code alongside
the derived results. That provenance is required before results can be audited.

## The path to responsibly adding project scores

Before displaying values such as “dam suitability 72%” or “building success
86%”, define:

1. the exact outcome and geographic scope;
2. a training/validation dataset with known outcomes;
3. physical, legal, ecological, economic, and community variables—not only
   satellite climate layers;
4. an externally validated method with uncertainty and bias checks;
5. a licensed human-review workflow for decisions.

Until those conditions exist, the right product language is **environmental
screening signal**, not a probability, approval, or prediction.

## Map choice

The app uses OpenStreetMap tiles with visible attribution and needs no token for
normal development or small interactive use. The public OSM tile servers are
best-effort and have a [usage policy](https://operations.osmfoundation.org/policies/tiles/);
they are not a production SLA or a bulk-download service.

You do **not** need to send a Mapbox or Google Maps token to keep developing.
For public launch or heavier traffic, choose a production map host, then add
only that provider’s client-safe public token through a Vite environment
variable. Mapbox is useful for polished vector styling; Google Maps is useful
when you specifically need Places, routing, or Street View. Neither solves the
scientific-data or validation work for project suitability.
# trendyplanets
