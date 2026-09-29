// ignore_for_file: invalid_use_of_visible_for_testing_member
// Renders every citizen-app screen to PNG for design review (not part of `flutter test`).
// Run:  flutter test test_screens --update-goldens   → images in test_screens/shots/
// Data comes from the offline cache (the test network always fails), which also exercises offline mode.
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:user_app/models/user.dart';
import 'package:user_app/models/bite_report.dart';
import 'package:user_app/providers/auth_provider.dart';
import 'package:user_app/providers/locale_provider.dart';
import 'package:user_app/providers/theme_provider.dart';
import 'package:user_app/screens/alerts_screen.dart';
import 'package:user_app/screens/city_stats_screen.dart';
import 'package:user_app/screens/home_screen.dart';
import 'package:user_app/screens/info_screen.dart';
import 'package:user_app/screens/login_screen.dart';
import 'package:user_app/screens/precautions_screen.dart';
import 'package:user_app/screens/report_screen.dart';
import 'package:user_app/screens/reports_screen.dart';
import 'package:user_app/screens/signup_screen.dart';
import 'package:user_app/screens/submitted_screen.dart';
import 'package:user_app/theme/rr_theme.dart';
import 'package:user_app/widgets/tehsil_map.dart';

Future<void> _loadFont(String family, List<String> paths) async {
  final loader = FontLoader(family);
  for (final p in paths) {
    loader.addFont(Future.value(ByteData.view(File(p).readAsBytesSync().buffer)));
  }
  await loader.load();
}

final _now = DateTime.now();
String _d(int days) => _now.add(Duration(days: days)).toIso8601String();

Map<String, Object> _cache() => {
      'cache:city-stats': jsonEncode({
        'totalCasesThisMonth': 142, 'totalCases': 1830, 'changePercent': 18, 'registeredHospitals': 18,
        'trend': [for (final (m, n) in [('Apr', 96), ('May', 104), ('Jun', 88), ('Jul', 112), ('Aug', 120), ('Sep', 142)]) {'month': m, 'count': n}],
        'activeNotices': [
          {'id': 9, 'title': 'More dog bites in Garha (Ward 42)', 'category': 'OutbreakAlert'},
          {'id': 8, 'title': 'Vaccine now at CHC Adhartal', 'category': 'NewHospital'},
        ],
        'areas': [
          {'name': 'Jabalpur', 'count': 85, 'lastMonth': 71}, {'name': 'Panagar', 'count': 14, 'lastMonth': 11},
          {'name': 'Patan', 'count': 11, 'lastMonth': 10}, {'name': 'Shahpura', 'count': 10, 'lastMonth': 10},
          {'name': 'Sihora', 'count': 9, 'lastMonth': 11}, {'name': 'Majholi', 'count': 7, 'lastMonth': 6},
          {'name': 'Kundam', 'count': 6, 'lastMonth': 7},
          {'name': 'Adhartal', 'count': 24, 'lastMonth': 18}, {'name': 'Ranjhi', 'count': 17, 'lastMonth': 15},
          {'name': 'Gorakhpur', 'count': 3, 'lastMonth': 1},
        ],
      }),
      'cache:hospitals': jsonEncode([
        {'id': 1, 'name': 'Victoria District Hospital', 'address': 'Civil Lines, near Collectorate', 'latitude': 23.16, 'longitude': 79.94, 'contactNumber': '07612620000'},
        {'id': 2, 'name': 'NSCB Medical College Hospital', 'address': 'Garha Road, Nagar Nigam', 'latitude': 23.13, 'longitude': 79.90, 'contactNumber': '07612670000'},
        {'id': 3, 'name': 'CHC Adhartal', 'address': 'Adhartal Main Road', 'latitude': 23.19, 'longitude': 79.96, 'contactNumber': '07612680000'},
      ]),
      'cache:alerts': jsonEncode([
        {'id': 9, 'category': 'OutbreakAlert', 'title': 'More dog bites in Garha (Ward 42)', 'body': '14 bites in 3 days. Keep children away from stray dogs. Get the vaccine the same day if bitten.', 'sentAt': _d(0)},
        {'id': 8, 'category': 'NewHospital', 'title': 'Vaccine now at CHC Adhartal', 'body': 'Free anti-rabies vaccine, 8 am – 8 pm, every day.', 'sentAt': _d(-2)},
        {'id': 7, 'category': 'GeneralAwareness', 'title': 'World Rabies Day — 28 September', 'body': 'Rabies can be prevented with timely vaccination. Free camps in all wards this week.', 'sentAt': _d(-3)},
        {'id': 6, 'category': 'MaintenanceNotice', 'title': 'App update on Sunday night', 'body': 'The app may not work from 11 pm to 1 am on 4 Oct. Call 108 in an emergency.', 'sentAt': _d(-4)},
      ]),
      'cache:reports': jsonEncode([
        {'id': 142, 'victimName': 'Ramesh Patel', 'contactNumber': '9826012345', 'animalType': 'Dog', 'animalStatus': 'Stray',
          'severity': 'DeepWound', 'status': 'UnderTreatment', 'createdAt': _d(-3), 'hospital': {'name': 'Victoria District Hospital'},
          'case_': {'status': 'UnderTreatment', 'doses': [
            {'doseNumber': 1, 'scheduledDate': _d(-3), 'givenDate': _d(-3)}, {'doseNumber': 2, 'scheduledDate': _d(0), 'givenDate': _d(0)},
            {'doseNumber': 3, 'scheduledDate': _d(4), 'givenDate': null}, {'doseNumber': 4, 'scheduledDate': _d(11), 'givenDate': null},
            {'doseNumber': 5, 'scheduledDate': _d(25), 'givenDate': null},
          ]}},
        {'id': 139, 'victimName': 'Aarav Patel', 'contactNumber': '9826012345', 'animalType': 'Monkey', 'animalStatus': 'Unknown',
          'severity': 'BleedingWound', 'status': 'Reported', 'createdAt': _d(-1), 'hospital': null, 'case_': null},
        {'id': 87, 'victimName': 'Ramesh Patel', 'contactNumber': '9826012345', 'animalType': 'Cat', 'animalStatus': 'OwnedAndVaccinated',
          'severity': 'MinorScratch', 'status': 'Completed', 'createdAt': _d(-60), 'hospital': {'name': 'CHC Adhartal'}, 'case_': null},
      ]),
    };

final _user = User(id: 3, fullName: 'Ramesh Patel', phoneNumber: '9826012345', cityId: 1, role: 'user');

Widget _app(Widget home, {required bool dark, required bool hindi}) {
  ThemeData t(ThemeData base) => base.copyWith(
        textTheme: base.textTheme.apply(fontFamily: 'Roboto', fontFamilyFallback: const ['Mangal']),
      );
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ChangeNotifierProvider(create: (_) {
        final l = LocaleProvider();
        if (hindi) l.toggle();
        return l;
      }),
      ChangeNotifierProvider(create: (_) => AuthProvider()..setUserForTest(_user)),
    ],
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: t(RRTheme.light()),
      darkTheme: t(RRTheme.dark()),
      themeMode: dark ? ThemeMode.dark : ThemeMode.light,
      home: DefaultTextStyle.merge(
        style: const TextStyle(fontFamily: 'Roboto', fontFamilyFallback: ['Mangal']),
        child: home,
      ),
    ),
  );
}

void main() {
  final flutterRoot = Platform.environment['FLUTTER_ROOT'] ?? 'C:/Users/yashk/flutter';
  final pub = '${Platform.environment['LOCALAPPDATA']}/Pub/Cache/hosted/pub.dev/lucide_icons_flutter-3.1.20';

  setUpAll(() async {
    final mf = '$flutterRoot/bin/cache/artifacts/material_fonts';
    await _loadFont('Roboto', ['$mf/roboto-regular.ttf', '$mf/roboto-medium.ttf', '$mf/roboto-bold.ttf']);
    await _loadFont('Mangal', ['C:/Windows/Fonts/mangal.ttf', 'C:/Windows/Fonts/mangalb.ttf']);
    await _loadFont('packages/lucide_icons_flutter/Lucide', ['$pub/assets/lucide.ttf']);
  });

  final shots = <String, Widget Function()>{
    'login': () => const LoginScreen(),
    'signup': () => const SignupScreen(),
    'home': () => const HomeScreen(),
    'report': () => const ReportScreen(),
    'submitted': () => const SubmittedScreen(reportId: 142, hospitals: [
          {'name': 'Victoria District Hospital', 'address': 'Civil Lines, near Collectorate', 'distanceKm': 1.2, 'contactNumber': '07612620000', 'latitude': 23.16, 'longitude': 79.94},
          {'name': 'NSCB Medical College Hospital', 'address': 'Garha Road, Nagar Nigam', 'distanceKm': 3.4, 'contactNumber': '07612670000', 'latitude': 23.13, 'longitude': 79.90},
        ]),
    'info': () => const Scaffold(body: InfoScreen()),
    'precautions': () => const Scaffold(body: PrecautionsScreen()),
    'alerts': () => const Scaffold(body: AlertsScreen()),
    'reports': () => const Scaffold(body: ReportsScreen()),
    'stats': () => const CityStatsScreen(),
  };

  for (final (theme, lang, width) in [('light', 'en', 360.0), ('dark', 'en', 360.0), ('light', 'hi', 360.0), ('light', 'hi', 320.0)]) {
    for (final entry in shots.entries) {
      final name = '${entry.key}_${theme}_${lang}_${width.toInt()}';
      testWidgets(name, (tester) async {
        SharedPreferences.setMockInitialValues(_cache());
        tester.view.physicalSize = Size(width * 2, 640 * 2);
        tester.view.devicePixelRatio = 2;
        addTearDown(tester.view.reset);
        await tester.runAsync(() => TehsilGeo.load());

        await tester.pumpWidget(_app(entry.value(), dark: theme == 'dark', hindi: lang == 'hi'));
        for (var i = 0; i < 8; i++) {
          await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 60)));
          await tester.pump(const Duration(milliseconds: 200));
        }
        await expectLater(find.byType(MaterialApp), matchesGoldenFile('shots/$name.png'));
      });
    }
  }

  for (final (screen, lang, width, dark) in [
    ('report', 'en', 360.0, false), ('report', 'hi', 320.0, false),
    ('stats', 'en', 360.0, false), ('stats', 'hi', 320.0, true),
  ]) {
    final shot = '${screen}_full_${dark ? 'dark' : 'light'}_${lang}_${width.toInt()}';
    testWidgets(shot, (tester) async {
      SharedPreferences.setMockInitialValues(_cache());
      tester.view.physicalSize = Size(width * 2, 2500 * 2);
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      await tester.runAsync(() => TehsilGeo.load());
      await tester.pumpWidget(_app(screen == 'report' ? const ReportScreen() : const CityStatsScreen(), dark: dark, hindi: lang == 'hi'));
      for (var i = 0; i < 8; i++) {
        await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 60)));
        await tester.pump(const Duration(milliseconds: 200));
      }
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('shots/$shot.png'));
    });
  }

  testWidgets('report_detail_light_en_360', (tester) async {
    SharedPreferences.setMockInitialValues(_cache());
    tester.view.physicalSize = const Size(720, 1280);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final report = BiteReport.fromJson((jsonDecode(_cache()['cache:reports'] as String) as List).first);
    await tester.pumpWidget(_app(Builder(builder: (context) => Scaffold(
          body: Center(child: TextButton(onPressed: () => showReportDetail(context, report), child: const Text('open'))),
        )), dark: false, hindi: false));
    await tester.tap(find.text('open'));
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('shots/report_detail_light_en_360.png'));
  });
}
