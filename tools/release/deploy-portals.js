#!/usr/bin/env node
// Builds both web portals against the hosted API and uploads them to Cloudflare (static sites).
//   node tools/release/deploy-portals.js            (both)
//   node tools/release/deploy-portals.js government (one)
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "../..");
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "release.config.json"), "utf8"));
const only = process.argv[2];
const PORTALS = { government: ["government-portal", cfg.govPagesProject], hospital: ["hospital-portal", cfg.hospitalPagesProject] };

for (const [key, [dir, project]] of Object.entries(PORTALS)) {
  if (only && only !== key) continue;
  const cwd = path.join(ROOT, dir);
  const env = { ...process.env, VITE_API_URL: `${cfg.apiBaseUrl}/api/v1` };
  console.log(`\n== ${dir} -> ${project}`);
  execSync("npx vite build", { cwd, env, stdio: "inherit", shell: true });
  execSync(`npx --yes wrangler deploy -c tools/release/cf/${project}.jsonc`, { cwd: ROOT, stdio: "inherit", shell: true });
}
