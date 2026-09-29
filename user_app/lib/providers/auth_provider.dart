import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';

enum AuthError { invalidCredentials, connection, portalOnly, server }

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _loading = false;
  AuthError? _error;
  String? _serverMessage;
  bool _sessionExpired = false;

  AuthProvider() {
    // Keep the user on screen and show the "session expired" dialog over it.
    ApiService.onUnauthorized = () async {
      await ApiService.clearToken();
      if (_user != null && !_sessionExpired) {
        _sessionExpired = true;
        notifyListeners();
      }
    };
  }

  User? get user => _user;
  bool get loading => _loading;
  bool get isLoggedIn => _user != null;
  AuthError? get error => _error;
  /// Server-provided reason, e.g. "Phone number already registered".
  String? get serverMessage => _serverMessage;
  bool get sessionExpired => _sessionExpired;

  /// Restores the session from the saved token. Returns true if the user is logged in.
  Future<bool> tryAutoLogin() async {
    final token = await ApiService.getToken();
    if (token == null) return false;
    try {
      final response = await ApiService.get('/auth/me', auth: true, cacheKey: 'me');
      final user = User.fromJson(response['user']);
      if (user.role != 'user') {
        await ApiService.clearToken();
        return false;
      }
      _user = user;
      notifyListeners();
      return true;
    } on NetworkException {
      // Offline: open with the saved profile so the saved reports, alerts and
      // stats are still readable. The server re-checks the session when back online.
      final cached = await ApiService.cached('me');
      if (cached is Map<String, dynamic> && cached['user'] is Map<String, dynamic>) {
        final user = User.fromJson(cached['user']);
        if (user.role == 'user') {
          _user = user;
          notifyListeners();
          return true;
        }
      }
      return false;
    } catch (_) {
      // Expired session: token already cleared.
      return false;
    }
  }

  Future<bool> _run(Future<void> Function() action) async {
    _loading = true;
    _error = null;
    _serverMessage = null;
    notifyListeners();
    try {
      await action();
      return _error == null;
    } on NetworkException {
      _error = AuthError.connection;
      return false;
    } on ApiException catch (e) {
      _error = e.statusCode == 401 ? AuthError.invalidCredentials : AuthError.server;
      _serverMessage = e.message;
      return false;
    } catch (_) {
      _error = AuthError.connection;
      return false;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> signup({
    required String fullName,
    required String phoneNumber,
    String? email,
    required String password,
    required int cityId,
  }) => _run(() async {
        final response = await ApiService.post('/auth/signup', {
          'fullName': fullName,
          'phoneNumber': phoneNumber,
          if (email != null) 'email': email,
          'password': password,
          'cityId': cityId,
        });
        await ApiService.setToken(response['token']);
        await ApiService.store('me', {'user': response['user']});
        _user = User.fromJson(response['user']);
      });

  Future<bool> login(String identifier, String password) => _run(() async {
        final response = await ApiService.post('/auth/login', {'identifier': identifier, 'password': password});
        final user = User.fromJson(response['user']);
        if (user.role != 'user') {
          _error = AuthError.portalOnly;
          return;
        }
        await ApiService.setToken(response['token']);
        await ApiService.store('me', {'user': response['user']});
        _user = user;
        _sessionExpired = false;
      });

  Future<void> logout() async {
    await ApiService.clearToken();
    _user = null;
    _sessionExpired = false;
    notifyListeners();
  }

  @visibleForTesting
  void setUserForTest(User user) {
    _user = user;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    _serverMessage = null;
    notifyListeners();
  }
}
