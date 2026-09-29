import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../models/city.dart';
import '../providers/auth_provider.dart';
import '../providers/locale_provider.dart';
import '../services/api_service.dart';
import '../theme/rr_theme.dart';
import '../widgets/rr.dart';

const _minPasswordLength = 8;
final _phonePattern = RegExp(r'^\+?\d{10,15}$');
final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
String _digits(String v) => v.replaceAll(RegExp(r'[\s-]'), '');

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _pw = TextEditingController();
  final _pw2 = TextEditingController();
  bool _obscure = true;
  List<City> _cities = [];
  int? _cityId;
  bool _citiesFailed = false;

  @override
  void initState() {
    super.initState();
    _loadCities();
  }

  Future<void> _loadCities() async {
    setState(() => _citiesFailed = false);
    try {
      final data = await ApiService.getList('/cities');
      if (!mounted) return;
      setState(() {
        _cities = data.map((e) => City.fromJson(e as Map<String, dynamic>)).toList();
        if (_cities.length == 1) _cityId = _cities.first.id;
      });
    } catch (_) {
      if (mounted) setState(() => _citiesFailed = true);
    }
  }

  @override
  void dispose() {
    for (final c in [_name, _phone, _email, _pw, _pw2]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _signup() async {
    final auth = context.read<AuthProvider>();
    auth.clearError();
    if (!_formKey.currentState!.validate() || _cityId == null) return;
    await auth.signup(
      fullName: _name.text.trim(),
      phoneNumber: _digits(_phone.text),
      email: _email.text.trim().isEmpty ? null : _email.text.trim(),
      password: _pw.text,
      cityId: _cityId!,
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: RRTopBar(
        title: s.signupTitle,
        back: true,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: OutlinedButton(
              onPressed: context.read<LocaleProvider>().toggle,
              style: OutlinedButton.styleFrom(minimumSize: const Size(48, 40), padding: const EdgeInsets.symmetric(horizontal: 12)),
              child: Text(s.langBtn),
            ),
          ),
        ],
      ),
      body: Column(children: [
        RROfflineBanner(onRetry: _loadCities),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: RRMaxWidth(
                child: Form(
                  key: _formKey,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    if (auth.error != null) ...[
                      auth.error == AuthError.connection
                          ? RRNotice(tone: RRTone.warning, icon: LucideIcons.wifiOff, title: s.connError,
                              action: RRPillAction(label: s.retry, onPressed: _signup))
                          : RRNotice(tone: RRTone.danger, icon: LucideIcons.circleAlert, title: auth.serverMessage ?? s.connError),
                      const SizedBox(height: 18),
                    ],
                    RRField(
                      label: s.fullName,
                      child: TextFormField(
                        controller: _name,
                        autofillHints: const [AutofillHints.name],
                        textCapitalization: TextCapitalization.words,
                        decoration: rrInput(context),
                        validator: (v) => v == null || v.trim().isEmpty ? s.required : null,
                      ),
                    ),
                    const SizedBox(height: 18),
                    RRField(
                      label: s.phone,
                      hint: s.phoneHint,
                      child: TextFormField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        autofillHints: const [AutofillHints.telephoneNumber],
                        decoration: rrInput(context, prefix: LucideIcons.phone),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return s.required;
                          return _phonePattern.hasMatch(_digits(v)) ? null : s.ePhone;
                        },
                      ),
                    ),
                    const SizedBox(height: 18),
                    _cityField(context),
                    const SizedBox(height: 18),
                    RRField(
                      label: s.email,
                      optionalText: s.optional,
                      child: TextFormField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        decoration: rrInput(context),
                        validator: (v) => v == null || v.trim().isEmpty || _emailPattern.hasMatch(v.trim()) ? null : s.eEmail,
                      ),
                    ),
                    const SizedBox(height: 18),
                    RRField(
                      label: s.password,
                      hint: s.pwHint,
                      child: TextFormField(
                        controller: _pw,
                        obscureText: _obscure,
                        autofillHints: const [AutofillHints.newPassword],
                        decoration: rrInput(context,
                            suffix: RRPasswordToggle(obscured: _obscure, onTap: () => setState(() => _obscure = !_obscure))),
                        validator: (v) => v == null || v.length < _minPasswordLength ? s.ePw : null,
                      ),
                    ),
                    const SizedBox(height: 18),
                    RRField(
                      label: s.confirmPw,
                      child: TextFormField(
                        controller: _pw2,
                        obscureText: _obscure,
                        decoration: rrInput(context),
                        validator: (v) => v != _pw.text ? s.ePw2 : null,
                      ),
                    ),
                    const SizedBox(height: 18),
                    RRButton(s.signupBtn, large: true, block: true, loading: auth.loading,
                        onPressed: _cityId == null ? null : _signup),
                    const SizedBox(height: 8),
                    Wrap(
                      alignment: WrapAlignment.center,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 4,
                      children: [
                        Text(s.haveAccount, style: t.bodyMedium?.copyWith(color: c.textSecondary)),
                        RRButton(s.loginBtn, kind: RRButtonKind.text, onPressed: () => Navigator.pop(context)),
                      ],
                    ),
                  ]),
                ),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _cityField(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;

    if (_citiesFailed) {
      return RRField(
        label: s.cityLabel,
        child: RRNotice(tone: RRTone.warning, icon: LucideIcons.wifiOff, title: s.eCities,
            action: RRPillAction(label: s.retry, onPressed: _loadCities)),
      );
    }
    if (_cities.length > 1) {
      return RRField(
        label: s.cityLabel,
        child: DropdownButtonFormField<int>(
          initialValue: _cityId,
          isExpanded: true,
          decoration: rrInput(context, prefix: LucideIcons.mapPin),
          items: _cities.map((city) => DropdownMenuItem(value: city.id, child: Text(city.name))).toList(),
          onChanged: (v) => setState(() => _cityId = v),
          validator: (v) => v == null ? s.required : null,
        ),
      );
    }
    // Single service city: shown locked, like the design.
    return RRField(
      label: s.cityLabel,
      hint: s.cityHint,
      child: Container(
        constraints: const BoxConstraints(minHeight: 48),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(color: c.surfaceAlt, border: Border.all(color: c.border), borderRadius: BorderRadius.circular(RRRadius.md)),
        child: Row(children: [
          Icon(LucideIcons.mapPin, size: 20, color: c.primary),
          const SizedBox(width: 10),
          Expanded(
            child: _cities.isEmpty
                ? const RRSkeleton(width: 96, height: 16)
                : Text(s.isHindi ? s.city : _cities.first.name, style: t.labelLarge),
          ),
          Icon(LucideIcons.lock, size: 18, color: c.textSecondary),
        ]),
      ),
    );
  }
}
