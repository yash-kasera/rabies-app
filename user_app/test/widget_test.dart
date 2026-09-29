import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:user_app/providers/auth_provider.dart';
import 'package:user_app/providers/locale_provider.dart';
import 'package:user_app/providers/theme_provider.dart';
import 'package:user_app/screens/login_screen.dart';
import 'package:user_app/theme/rr_theme.dart';

Widget _app() => MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: MaterialApp(theme: RRTheme.light(), home: const LoginScreen()),
    );

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('login screen renders and requires credentials', (tester) async {
    await tester.pumpWidget(_app());

    expect(find.text('Phone number or email'), findsOneWidget);
    expect(find.text("Don't have an account?"), findsOneWidget);

    await tester.tap(find.text('Log in').last);
    await tester.pump();
    expect(find.text('Required'), findsNWidgets(2));
  });

  testWidgets('language toggle switches the screen to Hindi', (tester) async {
    await tester.pumpWidget(_app());

    await tester.tap(find.text('हिंदी'));
    await tester.pump();
    expect(find.text('फ़ोन नंबर या ईमेल'), findsOneWidget);
    expect(find.text('English'), findsOneWidget);
  });
}
