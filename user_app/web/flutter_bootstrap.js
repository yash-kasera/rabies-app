{{flutter_js}}
{{flutter_build_config}}

// No serviceWorkerSettings: Flutter's own worker only unregisters itself, which would
// also remove offline_sw.js (registered in index.html) that keeps the app usable offline.
_flutter.loader.load();
