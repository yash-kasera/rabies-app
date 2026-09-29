import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'services/app_config.dart';
import 'services/updater.dart';
import 'theme/rr_theme.dart';
import 'widgets/rr.dart';

final navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Saved server settings first (works offline); the latest are fetched in the background.
  await AppConfig.loadCached();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: const RabiesApp(),
    ),
  );
}

class RabiesApp extends StatelessWidget {
  const RabiesApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeMode = context.watch<ThemeProvider>().themeMode;
    final locale = context.watch<LocaleProvider>();
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: locale.s.app,
      debugShowCheckedModeBanner: false,
      theme: RRTheme.light(),
      darkTheme: RRTheme.dark(),
      themeMode: themeMode,
      themeAnimationDuration: Duration.zero,
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _checking = true;
  bool? _wasLoggedIn;
  bool _sessionDialogOpen = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await context.read<AuthProvider>().tryAutoLogin();
    if (mounted) setState(() => _checking = false);
    // Android: offer a newer APK if one is published (web always loads the latest).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = navigatorKey.currentContext;
      if (ctx != null) {
        Updater.check(ctx);
      } else {
        AppConfig.refresh();
      }
    });
  }

  void _showSessionExpired() {
    if (_sessionDialogOpen) return;
    _sessionDialogOpen = true;
    final ctx = navigatorKey.currentContext;
    if (ctx == null) return;
    showDialog<void>(
      context: ctx,
      barrierDismissible: false,
      builder: (dialogContext) {
        final s = dialogContext.s;
        final c = dialogContext.rr;
        final t = Theme.of(dialogContext).textTheme;
        return PopScope(
          canPop: false,
          child: Dialog(
            insetPadding: const EdgeInsets.all(16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Container(
                    width: 56, height: 56,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: c.warningContainer),
                    child: Icon(LucideIcons.lock, size: 28, color: c.onWarningContainer),
                  ),
                  const SizedBox(height: 12),
                  Text(s.sessionTitle, style: t.titleLarge, textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  Text(s.sessionBody, style: t.bodyMedium?.copyWith(color: c.textSecondary), textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  RRButton(s.sessionBtn, block: true, onPressed: () {
                    Navigator.of(dialogContext).pop();
                    dialogContext.read<AuthProvider>().logout();
                  }),
                ]),
              ),
            ),
          ),
        );
      },
    ).whenComplete(() => _sessionDialogOpen = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return Scaffold(body: Center(child: CircularProgressIndicator(color: context.rr.primary)));
    }
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.sessionExpired) {
          WidgetsBinding.instance.addPostFrameCallback((_) => _showSessionExpired());
        }
        // When the session starts or ends, close screens pushed on top (the signup
        // form after signing up, or a report form after logging out).
        if (_wasLoggedIn != null && _wasLoggedIn != auth.isLoggedIn) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            navigatorKey.currentState?.popUntil((route) => route.isFirst);
          });
        }
        _wasLoggedIn = auth.isLoggedIn;
        return auth.isLoggedIn ? const HomeScreen() : const LoginScreen();
      },
    );
  }
}
