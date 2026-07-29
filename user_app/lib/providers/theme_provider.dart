import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeProvider extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;

  ThemeProvider() {
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('theme_mode');
    if (saved == 'light') {
      _themeMode = ThemeMode.light;
    } else if (saved == 'dark') {
      _themeMode = ThemeMode.dark;
    } else {
      _themeMode = ThemeMode.system;
    }
    notifyListeners();
  }

  Future<void> toggleTheme() async {
    final prefs = await SharedPreferences.getInstance();
    switch (_themeMode) {
      case ThemeMode.light:
        _themeMode = ThemeMode.dark;
        await prefs.setString('theme_mode', 'dark');
        break;
      case ThemeMode.dark:
        _themeMode = ThemeMode.system;
        await prefs.setString('theme_mode', 'system');
        break;
      case ThemeMode.system:
        _themeMode = ThemeMode.light;
        await prefs.setString('theme_mode', 'light');
        break;
    }
    notifyListeners();
  }
}