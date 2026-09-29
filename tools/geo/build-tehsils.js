// Builds Jabalpur's 10-tehsil boundaries.
// 8 tehsils: official LGD sub-district boundaries (india-geodata, CC0).
// Adhartal + Ranjhi have no published boundaries: they are carved APPROXIMATELY out of the
// urban part of Jabalpur tehsil (10 km around the city, split by nearest town centre).
const fs = require("fs");
const turf = require("@turf/turf");
const pl = require("polylabel"); const polylabel = pl.default || pl;

const OUT_BACKEND = process.argv[2];
const OUT_APP = process.argv[3];

const raw = fs.readFileSync("jbp_raw.geojsonl", "utf8").trim().split("\n").map(JSON.parse);
const by = Object.fromEntries(raw.map((f) => [f.properties.sdtname, f]));

const CITY_CENTRE = [79.95, 23.1667]; // Jabalpur city (lng, lat)
const URBAN = turf.circle([79.955, 23.185], 10, { units: "kilometers", steps: 96 });
const SEEDS = turf.featureCollection([
  turf.point([79.93, 23.165], { name: "Jabalpur" }),
  turf.point([79.95, 23.2], { name: "Adhartal" }),
  turf.point([80.0001, 23.1967], { name: "Ranjhi" }),
]);

const jab = by.Jabalpur;
const cells = turf.voronoi(SEEDS, { bbox: turf.bbox(jab) });
const cellOf = (name) => cells.features[SEEDS.features.findIndex((p) => p.properties.name === name)];
const carve = (name) => turf.intersect(turf.featureCollection([turf.intersect(turf.featureCollection([jab, URBAN])), cellOf(name)]));
const adhartal = carve("Adhartal");
const ranjhi = carve("Ranjhi");
const jabRest = turf.difference(turf.featureCollection([jab, turf.union(turf.featureCollection([adhartal, ranjhi]))]));

const APPROX = new Set(["Jabalpur", "Adhartal", "Ranjhi"]);
const features = [
  ...["Sihora", "Majholi", "Patan", "Shahpura", "Panagar", "Kundam", "Gorakhpur"].map((n) => by[n]),
  jabRest, adhartal, ranjhi,
].map((f, i) => {
  const name = i < 7 ? f.properties.sdtname : ["Jabalpur", "Adhartal", "Ranjhi"][i - 7];
  return turf.feature(f.geometry, { name, approximate: APPROX.has(name) });
});

for (const f of features) console.log(f.properties.name.padEnd(10), (turf.area(f) / 1e6).toFixed(1).padStart(7), "km²", f.properties.approximate ? "(approx)" : "");
for (const [n, p] of [["city centre", CITY_CENTRE], ["Adhartal", [79.95, 23.2]], ["Ranjhi", [80.0001, 23.1967]]]) {
  console.log(n, "->", features.find((f) => turf.booleanPointInPolygon(turf.point(p), f))?.properties.name);
}

// Backend: light simplification (~20 m) keeps counting accurate and the file small.
const backend = turf.featureCollection(features.map((f) => turf.simplify(f, { tolerance: 0.0002, highQuality: true })));
fs.writeFileSync(OUT_BACKEND, JSON.stringify(turf.truncate(backend, { precision: 5 })));

// App: pre-projected SVG paths for a district view and a zoomed city view.
function project(fc, width, tolerance) {
  const bbox = turf.bbox(fc);
  const lat0 = ((bbox[1] + bbox[3]) / 2) * Math.PI / 180;
  const pad = 6;
  const sx = Math.cos(lat0);
  const scale = (width - 2 * pad) / ((bbox[2] - bbox[0]) * sx);
  const height = Math.round((bbox[3] - bbox[1]) * scale + 2 * pad);
  const xy = ([lng, lat]) => [pad + (lng - bbox[0]) * sx * scale, pad + (bbox[3] - lat) * scale];
  const areas = fc.features.map((f) => {
    const simple = turf.simplify(f, { tolerance, highQuality: true });
    const polys = simple.geometry.type === "Polygon" ? [simple.geometry.coordinates] : simple.geometry.coordinates;
    const rings = polys.map((poly) => poly.map((ring) => ring.map(xy)));
    const d = rings.flatMap((poly) => poly.map((ring) =>
      "M" + ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z")).join("");
    // Label at the pole of inaccessibility of the largest piece.
    const biggest = rings.reduce((a, b) => (turf.area(turf.polygon(a.map((r) => r.map(([x, y]) => [x / 1000, y / 1000])))) >
      turf.area(turf.polygon(b.map((r) => r.map(([x, y]) => [x / 1000, y / 1000])))) ? a : b));
    const [lx, ly] = polylabel(biggest, 0.5);
    return { name: f.properties.name, approx: f.properties.approximate, d, lx: +lx.toFixed(1), ly: +ly.toFixed(1), area: turf.area(f) / 1e6 };
  });
  const [cx, cy] = xy(CITY_CENTRE);
  // Projection so clients can place GPS points (x = pad + (lng - lng0) * kx, y = pad + (lat0 - lat) * ky).
  const proj = { pad, lng0: bbox[0], lat0: bbox[3], kx: +(sx * scale).toFixed(6), ky: +scale.toFixed(6) };
  return { W: width, H: height, city: [+cx.toFixed(1), +cy.toFixed(1)], proj, areas };
}

const district = project(turf.featureCollection(features), 340, 0.002);
// Only large tehsils get a chip in the district view; the small urban ones are labelled in the city view.
district.areas.forEach((a) => { a.label = a.area > 150; delete a.area; });
// Nudge chips that would overlap at phone width (map units; chips are ~65 wide).
const NUDGE = { Jabalpur: [10, 26], Shahpura: [-22, 14], Patan: [-16, -4], Panagar: [14, -2] };
district.areas.forEach((a) => {
  const [dx, dy] = NUDGE[a.name] || [0, 0];
  a.lx = +(a.lx + dx).toFixed(1); a.ly = +(a.ly + dy).toFixed(1);
});

const cityBox = turf.bbox(turf.featureCollection([URBAN, by.Gorakhpur, turf.point(CITY_CENTRE)]));
const padDeg = 0.02;
const box = [cityBox[0] - padDeg, cityBox[1] - padDeg, cityBox[2] + padDeg, cityBox[3] + padDeg];
const clipped = turf.featureCollection(features
  .map((f) => turf.feature(turf.bboxClip(f, box).geometry, f.properties))
  .filter((f) => f.geometry.coordinates.length && turf.area(f) > 1e5));
const city = project(clipped, 340, 0.0004);
const CITY_TEHSILS = new Set(["Jabalpur", "Adhartal", "Ranjhi", "Gorakhpur"]);
city.areas.forEach((a) => { a.label = CITY_TEHSILS.has(a.name); delete a.area; });

fs.writeFileSync(OUT_APP, JSON.stringify({ source: "LGD sub-districts (india-geodata, CC0); Adhartal/Ranjhi approximate", district, city }));
console.log("district", district.W, "x", district.H, " city", city.W, "x", city.H);
console.log("backend bytes", fs.statSync(OUT_BACKEND).size, " app bytes", fs.statSync(OUT_APP).size);
