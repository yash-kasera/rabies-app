import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';
import '../theme/rr_theme.dart';
import '../widgets/rr.dart';
import 'signup_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _idController = TextEditingController();
  final _pwController = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _idController.dispose();
    _pwController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final auth = context.read<AuthProvider>();
    auth.clearError();
    if (!_formKey.currentState!.validate()) return;
    await auth.login(_idController.text.trim(), _pwController.text);
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final auth = context.watch<AuthProvider>();
    final theme = context.watch<ThemeProvider>();
    final dark = theme.isDark(context);

    return Scaffold(
      backgroundColor: c.surface,
      body: SafeArea(
        child: Column(children: [
          RROfflineBanner(onRetry: _login),
          Expanded(
            child: SingleChildScrollView(
              child: RRMaxWidth(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                      child: Wrap(alignment: WrapAlignment.end, spacing: 8, runSpacing: 8, children: [
                        OutlinedButton(
                          onPressed: context.read<LocaleProvider>().toggle,
                          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 14)),
                          child: Text(s.langBtn),
                        ),
                        OutlinedButton.icon(
                          onPressed: () => theme.toggleTheme(context),
                          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 14)),
                          icon: Icon(dark ? LucideIcons.sun : LucideIcons.moon, size: 18),
                          label: Text(dark ? s.light : s.dark),
                        ),
                      ]),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                      child: Form(
                        key: _formKey,
                        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                          Row(children: [
                            const RRLogoSlot(),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(s.app, style: t.titleLarge),
                                Text(s.city, style: t.bodySmall?.copyWith(color: c.textSecondary)),
                              ]),
                            ),
                          ]),
                          const SizedBox(height: 20),
                          Text(s.loginTitle, style: t.headlineMedium),
                          const SizedBox(height: 4),
                          Text(s.loginSub, style: t.bodyMedium?.copyWith(color: c.textSecondary)),
                          if (auth.error != null) ...[
                            const SizedBox(height: 20),
                            _errorBox(context, auth.error!),
                          ],
                          const SizedBox(height: 20),
                          RRField(
                            label: s.loginId,
                            child: TextFormField(
                              controller: _idController,
                              keyboardType: TextInputType.emailAddress,
                              autofillHints: const [AutofillHints.username],
                              textInputAction: TextInputAction.next,
                              decoration: rrInput(context),
                              validator: (v) => v == null || v.trim().isEmpty ? s.required : null,
                            ),
                          ),
                          const SizedBox(height: 20),
                          RRField(
                            label: s.password,
                            child: TextFormField(
                              controller: _pwController,
                              obscureText: _obscure,
                              autofillHints: const [AutofillHints.password],
                              onFieldSubmitted: (_) => _login(),
                              decoration: rrInput(context,
                                  suffix: RRPasswordToggle(obscured: _obscure, onTap: () => setState(() => _obscure = !_obscure))),
                              validator: (v) => v == null || v.isEmpty ? s.required : null,
                            ),
                          ),
                          const SizedBox(height: 20),
                          RRButton(s.loginBtn, large: true, block: true, loading: auth.loading, onPressed: _login),
                          const SizedBox(height: 8),
                          Center(
                            child: RRButton(s.forgotLink, kind: RRButtonKind.text, onPressed: () => _showForgot(context)),
                          ),
                          const SizedBox(height: 20),
                          Container(
                            padding: const EdgeInsets.only(top: 12),
                            decoration: BoxDecoration(border: Border(top: BorderSide(color: c.border))),
                            child: Wrap(
                              alignment: WrapAlignment.center,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 4,
                              children: [
                                Text(s.noAccount, style: t.bodyMedium?.copyWith(color: c.textSecondary)),
                                RRButton(s.signupLink, kind: RRButtonKind.text, onPressed: () {
                                  auth.clearError();
                                  Navigator.push(context, MaterialPageRoute(builder: (_) => const SignupScreen()));
                                }),
                              ],
                            ),
                          ),
                        ]),
                      ),
                    ),
                  ]),
              ),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _errorBox(BuildContext context, AuthError error) {
    final s = context.s;
    return switch (error) {
      AuthError.connection => RRNotice(
          tone: RRTone.warning, icon: LucideIcons.wifiOff, title: s.connError,
          action: RRPillAction(label: s.retry, onPressed: _login),
        ),
      AuthError.portalOnly => RRNotice(tone: RRTone.danger, icon: LucideIcons.circleAlert, title: s.portalOnly),
      AuthError.invalidCredentials => RRNotice(tone: RRTone.danger, icon: LucideIcons.circleAlert, title: s.loginInvalid),
      AuthError.server => RRNotice(
          tone: RRTone.danger, icon: LucideIcons.circleAlert,
          title: context.read<AuthProvider>().serverMessage ?? s.loginInvalid,
        ),
    };
  }

  void _showForgot(BuildContext context) {
    showDialog<void>(context: context, builder: (_) => const _ForgotDialog());
  }
}

class _ForgotDialog extends StatefulWidget {
  const _ForgotDialog();

  @override
  State<_ForgotDialog> createState() => _ForgotDialogState();
}

class _ForgotDialogState extends State<_ForgotDialog> {
  final _controller = TextEditingController();
  bool _sending = false;
  bool _done = false;
  bool _connError = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _reset() async {
    if (_controller.text.trim().isEmpty) return;
    setState(() {
      _sending = true;
      _connError = false;
    });
    try {
      await ApiService.post('/auth/forgot-password', {'identifier': _controller.text.trim()});
      if (mounted) setState(() => _done = true);
    } catch (_) {
      if (mounted) setState(() => _connError = true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: _done
              ? Column(mainAxisSize: MainAxisSize.min, children: [
                  Container(
                    width: 56, height: 56,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: c.successContainer),
                    child: Icon(LucideIcons.circleCheck, size: 28, color: c.onSuccessContainer),
                  ),
                  const SizedBox(height: 12),
                  Text(s.forgotDoneTitle, style: t.titleLarge, textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  Text(s.forgotDoneBody(_controller.text.trim()), style: t.bodyMedium?.copyWith(color: c.textSecondary), textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  RRButton(s.ok, block: true, onPressed: () => Navigator.pop(context)),
                ])
              : Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: c.primaryContainer),
                      child: Icon(LucideIcons.keyRound, size: 20, color: c.onPrimaryContainer),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Padding(padding: const EdgeInsets.only(top: 6), child: Text(s.forgotTitle, style: t.titleLarge))),
                  ]),
                  const SizedBox(height: 14),
                  Text(s.forgotBody, style: t.bodyMedium?.copyWith(color: c.textSecondary)),
                  if (_connError) ...[
                    const SizedBox(height: 14),
                    RRNotice(tone: RRTone.warning, icon: LucideIcons.wifiOff, title: s.connError),
                  ],
                  const SizedBox(height: 14),
                  RRField(
                    label: s.forgotField,
                    child: TextField(
                      controller: _controller,
                      autofocus: true,
                      keyboardType: TextInputType.emailAddress,
                      onSubmitted: (_) => _reset(),
                      decoration: rrInput(context),
                    ),
                  ),
                  const SizedBox(height: 14),
                  RRButton(s.resetBtn, block: true, loading: _sending, onPressed: _reset),
                  const SizedBox(height: 8),
                  RRButton(s.cancel, kind: RRButtonKind.secondary, block: true, onPressed: () => Navigator.pop(context)),
                ]),
        ),
      ),
    );
  }
}
