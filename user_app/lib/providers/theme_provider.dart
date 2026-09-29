import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Follows the phone's setting until the user picks Light or Dark.
class ThemeProvider extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;

  ThemeProvider() {
    _loadTheme();
  }

  bool isDark(BuildContext context) => _themeMode == ThemeMode.dark ||
      (_themeMode == ThemeMode.system && MediaQuery.platformBrightnessOf(context) == Brightness.dark);

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('theme_mode');
    _themeMode = switch (saved) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
    notifyListeners();
  }

  Future<void> toggleTheme(BuildContext context) async {
    _themeMode = isDark(context) ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('theme_mode', _themeMode == ThemeMode.dark ? 'dark' : 'light');
  }
}
