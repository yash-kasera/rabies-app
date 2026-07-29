import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _loading = false;
  String? _error;

  User? get user => _user;
  bool get loading => _loading;
  bool get isLoggedIn => _user != null;
  String? get error => _error;

  Future<bool> tryAutoLogin() async {
    final token = await ApiService.getToken();
    return token != null;
  }

  Future<bool> signup({
    required String fullName,
    required String phoneNumber,
    String? email,
    required String password,
    required int cityId,
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final body = {
        'fullName': fullName,
        'phoneNumber': phoneNumber,
        if (email != null) 'email': email,
        'password': password,
        'cityId': cityId,
      };
      final response = await ApiService.post('/auth/signup', body);
      await ApiService.setToken(response['token']);
      _user = User.fromJson(response['user']);
      _loading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _loading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Connection error. Please try again.';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> login(String identifier, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.post('/auth/login', {
        'identifier': identifier,
        'password': password,
      });
      await ApiService.setToken(response['token']);
      _user = User.fromJson(response['user']);
      _loading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _loading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Connection error. Please try again.';
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await ApiService.clearToken();
    _user = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}