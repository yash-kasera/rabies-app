import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Remote settings published next to the web app (config.json on the hosting site):
/// which server to talk to, and the latest Android version for in-app updates.
/// Lets the server move to another host without shipping a new APK.
///
/// Build with: `--dart-define=CONFIG_URL=https://your-site/config.json`
class AppConfig {
  static const String _url = String.fromEnvironment('CONFIG_URL');
  static const String _prefsKey = 'app-config';

  static Map<String, dynamic> _data = const {};

  /// Server base URL from the remote config, if any (HTTPS only).
  static String? get apiBaseUrl {
    final v = _data['apiBaseUrl'];
    return v is String && v.startsWith('https://') ? v.replaceAll(RegExp(r'/+$'), '') : null;
  }

  /// Latest Android release: {versionCode, versionName, apkUrl, sha256, minVersionCode}.
  static Map<String, dynamic>? get android => _data['android'] is Map<String, dynamic> ? _data['android'] : null;

  /// Loads the last saved config (instant, works offline). Call before runApp.
  static Future<void> loadCached() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefsKey);
      if (raw != null) _data = jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {}
  }

  /// Fetches the latest config; keeps the saved one if offline. Returns true if fetched.
  static Future<bool> refresh() async {
    if (_url.isEmpty) return false;
    try {
      // Cache-busting query so a CDN never serves a stale version check.
      final uri = Uri.parse(_url).replace(queryParameters: {'t': '${DateTime.now().millisecondsSinceEpoch ~/ 60000}'});
      final res = await http.get(uri).timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return false;
      final data = jsonDecode(res.body);
      if (data is! Map<String, dynamic>) return false;
      _data = data;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, res.body);
      return true;
    } catch (e) {
      debugPrint('Config refresh failed: $e');
      return false;
    }
  }
}
