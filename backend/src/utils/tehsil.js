const fs = require("fs");
const path = require("path");

// Jabalpur district: all 10 tehsils. 8 from official LGD sub-district boundaries (CC0);
// Adhartal and Ranjhi are APPROXIMATE (no published boundaries) — see tools/geo/build-tehsils.js.
const geo = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/jabalpur-tehsils.geojson"), "utf8"));

const TEHSILS = geo.features.map((f) => ({
  name: f.properties.name,
  polygons: f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates,
}));

// Ray casting on the outer ring ([lng, lat] pairs).
function inRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Inside the outer ring and not inside any hole (Jabalpur has holes where
// Adhartal and Ranjhi were carved out).
function inPolygon(lng, lat, poly) {
  return inRing(lng, lat, poly[0]) && !poly.slice(1).some((hole) => inRing(lng, lat, hole));
}

/** Tehsil name containing the point, or null if it is outside the district. */
function tehsilOf(lat, lng) {
  const hit = TEHSILS.find((t) => t.polygons.some((poly) => inPolygon(lng, lat, poly)));
  return hit ? hit.name : null;
}

const TEHSIL_NAMES = TEHSILS.map((t) => t.name);

module.exports = { tehsilOf, TEHSIL_NAMES };
