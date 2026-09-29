#!/usr/bin/env node
// Publishes a new version of the citizen app in one step:
//   node tools/release/release-app.js "What changed"            (optional update)
//   node tools/release/release-app.js "What changed" --required (older versions must update)
//
// 1. bumps the version in user_app/pubspec.yaml
// 2. builds the signed Android APK and the web app
// 3. writes config.json (server URL + latest APK version and checksum)
// 4. uploads everything to Cloudflare (static site)
// Installed apps see the new version on their next launch and offer to update.
// Needs: tools/release/release.config.json, user_app/android/key.properties, `wrangler login`.

const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const APP = path.join(ROOT, "user_app");
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "release.config.json"), "utf8"));
const notes = process.argv.slice(2).find((a) => !a.startsWith("--")) || "";
const required = process.argv.includes("--required");
const dryRun = process.argv.includes("--no-deploy");

const run = (cmd, cwd = APP) => { console.log(`\n> ${cmd}`); execSync(cmd, { cwd, stdio: "inherit", shell: true }); };
const siteUrl = cfg.siteUrl.replace(/\/+$/, "");
if (!/^https:\/\//.test(siteUrl) || !/^https:\/\//.test(cfg.apiBaseUrl)) throw new Error("siteUrl and apiBaseUrl must be https:// URLs");
if (!fs.existsSync(path.join(APP, "android/key.properties"))) throw new Error("Missing android/key.properties (release signing key)");

// 1. version bump: 1.0.3+4 -> 1.0.4+5
const pubspecPath = path.join(APP, "pubspec.yaml");
const pubspec = fs.readFileSync(pubspecPath, "utf8");
const m = pubspec.match(/^version:\s*(\d+)\.(\d+)\.(\d+)\+(\d+)\s*$/m);
if (!m) throw new Error("Could not read version from pubspec.yaml");
const versionName = `${m[1]}.${m[2]}.${+m[3] + 1}`;
const versionCode = +m[4] + 1;
fs.writeFileSync(pubspecPath, pubspec.replace(m[0], `version: ${versionName}+${versionCode}`));
console.log(`Releasing ${versionName} (build ${versionCode})`);

// 2. builds. The config URL is baked in; the server URL comes from config.json at runtime.
const defines = `--dart-define=CONFIG_URL=${siteUrl}/config.json --dart-define=API_BASE_URL=${cfg.apiBaseUrl}`;
const ARM = "--target-platform android-arm,android-arm64";
// Universal APK (32 + 64-bit ARM) for the website: works on any phone for a first install.
run(`flutter build apk --release ${ARM} ${defines}`);
const out = path.join(APP, "build/app/outputs/flutter-apk");
const universal = fs.readFileSync(path.join(out, "app-release.apk"));
// Smaller per-chip APKs for in-app updates (the app knows its own chip type).
run(`flutter build apk --release --split-per-abi ${ARM} ${defines}`);
run(`flutter build web --release --no-web-resources-cdn ${defines}`);

const web = path.join(APP, "build/web");
const dl = path.join(web, "downloads");
fs.mkdirSync(dl, { recursive: true });
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const MB = (b) => (b.length / 1048576).toFixed(1);
const publish = (buf, name) => {
  if (buf.length > 25 * 1024 * 1024) throw new Error(`${name} is ${MB(buf)} MB; Cloudflare Pages allows 25 MB per file`);
  fs.writeFileSync(path.join(dl, name), buf);
  return { url: `${siteUrl}/downloads/${name}`, sha256: sha(buf), sizeMB: +MB(buf) };
};
const main = publish(universal, "rabies-response.apk");
const apks = {};
for (const abi of ["arm64-v8a", "armeabi-v7a"]) {
  apks[abi] = publish(fs.readFileSync(path.join(out, `app-${abi}-release.apk`)), `rabies-response-${abi}.apk`);
}
const apk = universal;
const sha256 = main.sha256;

const prevMin = cfg.minVersionCode || 1;
const minVersionCode = required ? versionCode : prevMin;
if (required) fs.writeFileSync(path.join(__dirname, "release.config.json"), JSON.stringify({ ...cfg, minVersionCode }, null, 2) + "\n");

const config = {
  apiBaseUrl: cfg.apiBaseUrl,
  android: {
    versionCode, versionName, minVersionCode, sha256, notes,
    apkUrl: main.url,
    apks,
    releasedAt: new Date().toISOString(),
  },
};
fs.writeFileSync(path.join(web, "config.json"), JSON.stringify(config, null, 2));

// Keep a copy of every release APK locally (gitignored build folder).
const outDir = path.join(ROOT, "dist/apk");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `rabies-response-${versionName}.apk`), universal);

// 4. upload
if (!dryRun) run(`npx --yes wrangler deploy -c tools/release/cf/${cfg.pagesProject}.jsonc`, ROOT);

console.log(`\nDone: ${versionName} (build ${versionCode}). Website APK ${MB(apk)} MB; update APKs ${apks["arm64-v8a"].sizeMB} MB (64-bit) / ${apks["armeabi-v7a"].sizeMB} MB (32-bit).`);
console.log(`Download page: ${siteUrl}/download.html`);
