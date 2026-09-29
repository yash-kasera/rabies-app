import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../l10n/strings.dart';

class LocaleProvider extends ChangeNotifier {
  static const _key = 'lang';
  bool _hindi = false;

  LocaleProvider() {
    _load();
  }

  bool get isHindi => _hindi;
  S get s => _hindi ? S.hi : S.en;
  Locale get locale => Locale(_hindi ? 'hi' : 'en');

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_key);
    if (saved == 'hi' && !_hindi) {
      _hindi = true;
      notifyListeners();
    }
  }

  Future<void> toggle() async {
    _hindi = !_hindi;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, _hindi ? 'hi' : 'en');
  }
}

extension StringsContext on BuildContext {
  /// Current strings; rebuilds the widget when the language changes.
  S get s => watch<LocaleProvider>().s;
}
