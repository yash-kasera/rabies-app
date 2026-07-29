import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String _tokenKey = 'auth_token';

  static String get defaultBaseUrl {
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
  }

  static Future<Map<String, String>> _headers({bool auth = false}) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final token = await getToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body, {bool auth = false}) async {
    final response = await http.post(
      Uri.parse('$defaultBaseUrl/api/v1$path'),
      headers: await _headers(auth: auth),
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> get(String path, {bool auth = false, Map<String, String>? queryParams}) async {
    var uri = Uri.parse('$defaultBaseUrl/api/v1$path');
    if (queryParams != null) uri = uri.replace(queryParameters: queryParams);
    final response = await http.get(uri, headers: await _headers(auth: auth));
    return _handleResponse(response);
  }

  static Map<String, dynamic> _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      return data is Map<String, dynamic> ? data : {'data': data};
    }
    String message = 'Request failed';
    try {
      final data = jsonDecode(response.body);
      message = data['error'] ?? message;
    } catch (_) {}
    throw ApiException(message, response.statusCode);
  }

  static Future<List<dynamic>> getList(String path, {bool auth = false, Map<String, String>? queryParams}) async {
    var uri = Uri.parse('$defaultBaseUrl/api/v1$path');
    if (queryParams != null) uri = uri.replace(queryParameters: queryParams);
    final response = await http.get(uri, headers: await _headers(auth: auth));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as List<dynamic>;
    }
    String message = 'Request failed';
    try {
      final data = jsonDecode(response.body);
      message = data['error'] ?? message;
    } catch (_) {}
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