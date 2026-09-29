import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'app_config.dart';

class ApiService {
  static const String _tokenKey = 'auth_token';
  static const String _cachePrefix = 'cache:';
  static const Duration _timeout = Duration(seconds: 20);

  // Override per build: flutter run --dart-define=API_BASE_URL=https://api.example.in
  static const String _configuredBaseUrl = String.fromEnvironment('API_BASE_URL');

  /// Called when an authenticated request is rejected (expired/invalid session).
  static FutureOr<void> Function()? onUnauthorized;

  /// True after a request fails to reach the server; false again on the next response.
  static final ValueNotifier<bool> offline = ValueNotifier(false);

  static String get defaultBaseUrl {
    final remote = AppConfig.apiBaseUrl;
    if (remote != null) return remote;
    if (_configuredBaseUrl.isNotEmpty) return _configuredBaseUrl;
    if (kIsWeb) return 'http://localhost:5000';
    return 'http://10.0.2.2:5000';
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    // Cached reports belong to the signed-out user.
    for (final k in prefs.getKeys().where((k) => k.startsWith(_cachePrefix)).toList()) {
      await prefs.remove(k);
    }
  }

  /// Last successful response for [key], for showing saved data while offline.
  static Future<dynamic> cached(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_cachePrefix$key');
    return raw == null ? null : jsonDecode(raw);
  }

  /// Saves [data] for offline use under [key].
  static Future<void> store(String key, dynamic data) => _store(key, data);

  static Future<void> _store(String key, dynamic data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_cachePrefix$key', jsonEncode(data));
  }

  static Future<Map<String, String>> _headers({bool auth = false}) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final token = await getToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Uri _uri(String path, Map<String, String>? queryParams) {
    final uri = Uri.parse('$defaultBaseUrl/api/v1$path');
    return queryParams == null ? uri : uri.replace(queryParameters: queryParams);
  }

  static Future<http.Response> _send(Future<http.Response> Function() request) async {
    try {
      final response = await request().timeout(_timeout);
      offline.value = false;
      return response;
    } catch (_) {
      offline.value = true;
      throw NetworkException();
    }
  }

  static Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body, {bool auth = false}) async {
    final headers = await _headers(auth: auth);
    final response = await _send(() => http.post(_uri(path, null), headers: headers, body: jsonEncode(body)));
    final data = await _decode(response, auth);
    return data is Map<String, dynamic> ? data : {'data': data};
  }

  static Future<Map<String, dynamic>> get(String path, {bool auth = false, Map<String, String>? queryParams, String? cacheKey}) async {
    final headers = await _headers(auth: auth);
    final response = await _send(() => http.get(_uri(path, queryParams), headers: headers));
    final data = await _decode(response, auth);
    if (cacheKey != null) await _store(cacheKey, data);
    return data is Map<String, dynamic> ? data : {'data': data};
  }

  static Future<List<dynamic>> getList(String path, {bool auth = false, Map<String, String>? queryParams, String? cacheKey}) async {
    final headers = await _headers(auth: auth);
    final response = await _send(() => http.get(_uri(path, queryParams), headers: headers));
    final data = await _decode(response, auth);
    if (cacheKey != null) await _store(cacheKey, data);
    return data as List<dynamic>;
  }

  /// Raw bytes (e.g. a report photo) from an authenticated endpoint.
  static Future<Uint8List> getBytes(String path) async {
    final headers = await _headers(auth: true);
    final response = await _send(() => http.get(_uri(path, null), headers: headers));
    if (response.statusCode >= 200 && response.statusCode < 300) return response.bodyBytes;
    await _decode(response, true);
    throw ApiException('Request failed', response.statusCode);
  }

  static Future<dynamic> _decode(http.Response response, bool auth) async {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    String message = 'Request failed';
    try {
      final data = jsonDecode(response.body);
      message = data['error'] ?? message;
    } catch (_) {}
    if (auth && response.statusCode == 401) {
      await onUnauthorized?.call();
      throw SessionExpiredException();
    }
    throw ApiException(message, response.statusCode);
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, this.statusCode);
  @override
  String toString() => message;
}

/// The server could not be reached (no internet, timeout).
class NetworkException implements Exception {}

/// The saved login is no longer valid.
class SessionExpiredException implements Exception {}
