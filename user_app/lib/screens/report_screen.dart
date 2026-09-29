import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../l10n/strings.dart';
import '../providers/auth_provider.dart';
import '../providers/locale_provider.dart';
import '../services/api_service.dart';
import '../theme/rr_theme.dart';
import '../widgets/rr.dart';
import '../widgets/voice_recorder.dart';
import 'submitted_screen.dart';

enum _Loc { detecting, precise, approximate, unavailable }

const _animals = ['Dog', 'Cat', 'Monkey', 'Bat', 'Other'];
const _conditions = ['LookedHealthy', 'LookedSickOrAggressive', 'Stray', 'OwnedAndVaccinated', 'Unknown'];
const _severities = ['MinorScratch', 'BleedingWound', 'DeepWound', 'MultipleBites'];
final _phonePattern = RegExp(r'^\+?\d{10,15}$');
const _maxPhotoBytes = 5 * 1024 * 1024;
const _maxDescription = 500;

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _description = TextEditingController();
  Uint8List? _photo;
  Uint8List? _voice;
  int _voiceSeconds = 0;
  bool _pickingPhoto = false;
  double? _lat, _lng;
  int? _accuracyM;
  _Loc _loc = _Loc.detecting;
  String? _animal;
  String? _condition;
  String? _severity;
  bool _triedSubmit = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    if (user != null) {
      _name.text = user.fullName;
      _phone.text = user.phoneNumber;
    }
    _detectLocation();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _description.dispose();
    super.dispose();
  }

  /// Device GPS first — hospitals need the real bite location. Falls back to an
  /// approximate network location only if GPS is off or permission is refused.
  Future<void> _detectLocation() async {
    setState(() => _loc = _Loc.detecting);
    try {
      if (await Geolocator.isLocationServiceEnabled()) {
        var permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
          final pos = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 15)),
          );
          if (!mounted) return;
          setState(() {
            _lat = pos.latitude;
            _lng = pos.longitude;
            _accuracyM = pos.accuracy.round();
            _loc = _Loc.precise;
          });
          return;
        }
      }
    } catch (_) {}

    try {
      final res = await http.get(Uri.parse('https://ipapi.co/json/')).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final lat = (data['latitude'] as num?)?.toDouble();
        final lng = (data['longitude'] as num?)?.toDouble();
        if (lat != null && lng != null && mounted) {
          setState(() {
            _lat = lat;
            _lng = lng;
            _loc = _Loc.approximate;
          });
          return;
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loc = _Loc.unavailable);
  }

  /// Downscaled on the phone (1280 px, JPEG 70 %) so uploads stay small on 2G.
  Future<void> _pickPhoto(ImageSource source) async {
    final s = context.read<LocaleProvider>().s;
    setState(() => _pickingPhoto = true);
    try {
      final file = await ImagePicker().pickImage(source: source, maxWidth: 1280, maxHeight: 1280, imageQuality: 70);
      if (file == null) return;
      final bytes = await file.readAsBytes();
      if (!mounted) return;
      if (bytes.length > _maxPhotoBytes) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s.photoTooLarge)));
        return;
      }
      setState(() => _photo = bytes);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s.cameraError)));
    } finally {
      if (mounted) setState(() => _pickingPhoto = false);
    }
  }

  Future<void> _submit() async {
    final s = context.read<LocaleProvider>().s;
    setState(() => _triedSubmit = true);
    final formOk = _formKey.currentState!.validate();
    if (!formOk || _animal == null || _severity == null || _photo == null) return;
    if (_lat == null || _lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s.needLocation)));
      return;
    }
    setState(() => _submitting = true);
    try {
      final res = await ApiService.post('/user/reports', {
        'victimName': _name.text.trim(),
        'contactNumber': _phone.text.replaceAll(RegExp(r'[\s-]'), ''),
        'latitude': _lat,
        'longitude': _lng,
        'animalType': _animal,
        'animalStatus': _condition ?? 'Unknown',
        'severity': _severity,
        'description': _description.text.trim(),
        'photo': base64Encode(_photo!),
        if (_voice != null) 'voice': base64Encode(_voice!),
        if (_voice != null) 'voiceSeconds': _voiceSeconds,
        'cityId': context.read<AuthProvider>().user!.cityId,
      }, auth: true);
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => SubmittedScreen(
        reportId: res['report']['id'] as int,
        hospitals: (res['hospitals'] as List?) ?? const [],
      )));
    } on SessionExpiredException {
      // The session dialog takes over.
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s.sendFailed)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;

    return Scaffold(
      appBar: RRTopBar(title: s.reportTitle, back: true),
      body: Column(children: [
        RROfflineBanner(onRetry: _detectLocation),
        Expanded(
          child: Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _locationCard(s),
                const SizedBox(height: 20),
                _Group(
                  title: s.whichAnimal,
                  error: _triedSubmit && _animal == null ? s.pickAnimal : null,
                  child: Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final a in _animals)
                      RRChip(label: s.status(a), selected: _animal == a, onTap: () => setState(() => _animal = a)),
                  ]),
                ),
                const SizedBox(height: 20),
                _Group(
                  title: s.howBad,
                  error: _triedSubmit && _severity == null ? s.pickSeverity : null,
                  child: Column(children: [
                    for (var i = 0; i < _severities.length; i++) ...[
                      if (i > 0) const SizedBox(height: 8),
                      RROption(
                        selected: _severity == _severities[i],
                        onTap: () => setState(() => _severity = _severities[i]),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          RRBadge.of(RRStatus.severity, _severities[i], s, pips: true),
                          const SizedBox(height: 6),
                          Text(s.sevDesc[i]),
                        ]),
                      ),
                    ],
                  ]),
                ),
                const SizedBox(height: 20),
                _Group(
                  title: s.photoTitle,
                  error: _triedSubmit && _photo == null ? s.needPhoto : null,
                  child: _photoPicker(s),
                ),
                const SizedBox(height: 20),
                _Group(
                  title: s.animalLook,
                  child: Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final cond in _conditions)
                      RRChip(label: s.status(cond), selected: _condition == cond, onTap: () => setState(() => _condition = cond)),
                  ]),
                ),
                const SizedBox(height: 20),
                _Group(
                  title: '${s.describeTitle} ${s.optional}',
                  child: TextFormField(
                    controller: _description,
                    minLines: 3,
                    maxLines: 6,
                    maxLength: _maxDescription,
                    keyboardType: TextInputType.multiline,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: rrInput(context).copyWith(hintText: s.describeHint, hintMaxLines: 3),
                  ),
                ),
                const SizedBox(height: 12),
                _Group(
                  title: '${s.voiceTitle} ${s.optional}',
                  child: VoiceRecorder(onChanged: (bytes, secs) => setState(() {
                    _voice = bytes;
                    _voiceSeconds = secs;
                  })),
                ),
                const SizedBox(height: 20),
                RRCard(
                  padding: const EdgeInsets.all(14),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Text(s.who, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 14),
                    RRField(
                      label: s.victimName,
                      child: TextFormField(
                        controller: _name,
                        textCapitalization: TextCapitalization.words,
                        decoration: rrInput(context),
                        validator: (v) => v == null || v.trim().isEmpty ? s.required : null,
                      ),
                    ),
                    const SizedBox(height: 14),
                    RRField(
                      label: s.contactNumber,
                      hint: s.fromProfile,
                      child: TextFormField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        decoration: rrInput(context, prefix: LucideIcons.phone),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return s.required;
                          return _phonePattern.hasMatch(v.replaceAll(RegExp(r'[\s-]'), '')) ? null : s.ePhone;
                        },
                      ),
                    ),
                  ]),
                ),
              ],
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(color: c.surface, border: Border(top: BorderSide(color: c.border))),
          child: SafeArea(
            top: false,
            child: RRButton(
              _submitting ? s.sending : _loc == _Loc.detecting ? s.gettingLoc : s.submitReport,
              icon: _loc == _Loc.detecting && !_submitting ? LucideIcons.loader : LucideIcons.siren,
              kind: RRButtonKind.emergency,
              large: true,
              block: true,
              loading: _submitting,
              onPressed: _loc == _Loc.detecting ? null : _submit,
            ),
          ),
        ),
      ]),
    );
  }

  Widget _photoPicker(S s) {
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final hint = Text(s.photoHint, style: t.bodySmall?.copyWith(color: c.textSecondary));
    if (_photo == null) {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        RRButton(s.takePhoto, icon: LucideIcons.camera, block: true, loading: _pickingPhoto,
            onPressed: () => _pickPhoto(ImageSource.camera)),
        // On the web the camera option already opens a file chooser.
        if (!kIsWeb) ...[
          const SizedBox(height: 8),
          RRButton(s.fromGallery, icon: LucideIcons.image, kind: RRButtonKind.secondary, block: true,
              onPressed: _pickingPhoto ? null : () => _pickPhoto(ImageSource.gallery)),
        ],
        const SizedBox(height: 8),
        hint,
      ]);
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(RRRadius.md),
        child: Semantics(
          image: true,
          label: s.photoTitle,
          // cacheWidth keeps the decoded preview small in memory on cheap phones.
          child: Image.memory(_photo!, height: 200, fit: BoxFit.cover, cacheWidth: 720, gaplessPlayback: true),
        ),
      ),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: RRButton(s.retakePhoto, icon: LucideIcons.camera, kind: RRButtonKind.secondary, block: true,
            onPressed: _pickingPhoto ? null : () => _pickPhoto(ImageSource.camera))),
        const SizedBox(width: 8),
        RRButton(s.removePhoto, icon: LucideIcons.trash2, kind: RRButtonKind.text,
            onPressed: () => setState(() => _photo = null)),
      ]),
      const SizedBox(height: 8),
      hint,
    ]);
  }

  Widget _locationCard(S s) => switch (_loc) {
        _Loc.detecting => RRNotice(tone: RRTone.info, icon: LucideIcons.loader, title: s.detecting, body: s.detectingSub),
        _Loc.precise => RRNotice(
            tone: RRTone.success, icon: LucideIcons.locateFixed, title: s.precise,
            body: s.preciseSub(_accuracyM ?? 0), trailing: const Icon(LucideIcons.circleCheck, size: 20),
          ),
        _Loc.approximate => RRNotice(
            tone: RRTone.warning, icon: LucideIcons.triangleAlert, title: s.approx, body: s.approxSub,
            action: RRPillAction(label: s.retry, icon: LucideIcons.refreshCw, onPressed: _detectLocation),
          ),
        _Loc.unavailable => RRNotice(
            tone: RRTone.danger, icon: LucideIcons.circleX, title: s.noLoc, body: s.noLocSub,
            action: RRPillAction(label: s.retry, icon: LucideIcons.refreshCw, tone: RRTone.danger, onPressed: _detectLocation),
          ),
      };
}

/// Fieldset: large legend, optional inline error, then the options.
class _Group extends StatelessWidget {
  final String title;
  final String? error;
  final Widget child;
  const _Group({required this.title, required this.child, this.error});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    return Semantics(
      container: true,
      label: title,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(title, style: t.titleMedium),
        if (error != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Row(children: [
              Icon(LucideIcons.circleAlert, size: 16, color: c.danger),
              const SizedBox(width: 6),
              Expanded(child: Text(error!, style: t.bodySmall?.copyWith(color: c.danger, fontWeight: FontWeight.w600))),
            ]),
          ),
        const SizedBox(height: 10),
        child,
      ]),
    );
  }
}
