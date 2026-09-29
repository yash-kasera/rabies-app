import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/locale_provider.dart';
import '../theme/rr_theme.dart';
import '../widgets/rr.dart';
import 'home_screen.dart';

Future<void> openDirections(BuildContext context, num lat, num lng) async {
  final s = context.read<LocaleProvider>().s;
  final ok = await launchUrl(Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng'),
      mode: LaunchMode.externalApplication);
  if (!ok && context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s.mapsFailed)));
}

Future<void> callNumber(String number) => launchUrl(Uri(scheme: 'tel', path: number));

class SubmittedScreen extends StatelessWidget {
  final int reportId;
  final List<dynamic> hospitals;
  const SubmittedScreen({super.key, required this.reportId, required this.hospitals});

  void _home(BuildContext context) {
    homeTab.value = 0;
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _home(context);
      },
      child: Scaffold(
        body: SafeArea(
          child: Column(children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                children: [
                  Center(
                    child: Container(
                      width: 64, height: 64,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: c.successContainer),
                      child: Icon(LucideIcons.circleCheck, size: 36, color: c.onSuccessContainer),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(s.sentTitle, style: t.headlineSmall, textAlign: TextAlign.center),
                  const SizedBox(height: 4),
                  Text.rich(
                    TextSpan(style: t.bodySmall?.copyWith(color: c.textSecondary), children: [
                      TextSpan(text: '${s.reportNumber} '),
                      TextSpan(text: reportNumber(reportId),
                          style: TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w600, color: c.textPrimary)),
                    ]),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  hospitals.isEmpty
                      ? RRNotice(tone: RRTone.warning, icon: LucideIcons.triangleAlert, title: s.sentToNone)
                      : RRNotice(tone: RRTone.primary, solid: true, icon: LucideIcons.hospital, title: s.sentToN(hospitals.length)),
                  if (hospitals.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Text(s.nearest, style: t.titleMedium),
                    for (final h in hospitals) ...[
                      const SizedBox(height: 12),
                      _HospitalCard(hospital: h),
                    ],
                  ],
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              decoration: BoxDecoration(color: c.surface, border: Border(top: BorderSide(color: c.border))),
              child: RRButton(s.backHome, icon: LucideIcons.house, kind: RRButtonKind.secondary, block: true,
                  onPressed: () => _home(context)),
            ),
          ]),
        ),
      ),
    );
  }
}

class _HospitalCard extends StatelessWidget {
  final dynamic hospital;
  const _HospitalCard({required this.hospital});

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final phone = (hospital['contactNumber'] ?? '').toString();
    final km = hospital['distanceKm'];
    return RRCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(hospital['name'] ?? '', style: t.labelLarge),
              Text(hospital['address'] ?? '', style: t.bodySmall?.copyWith(color: c.textSecondary)),
            ]),
          ),
          if (km != null) ...[
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
              decoration: BoxDecoration(color: c.surfaceAlt, borderRadius: BorderRadius.circular(RRRadius.pill)),
              child: Text('$km ${s.km}', style: t.labelMedium?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
            ),
          ],
        ]),
        const SizedBox(height: 10),
        Row(children: [
          if (phone.isNotEmpty) ...[
            Expanded(child: RRButton(s.call, icon: LucideIcons.phone, kind: RRButtonKind.secondary, block: true,
                onPressed: () => callNumber(phone))),
            const SizedBox(width: 8),
          ],
          Expanded(child: RRButton(s.directions, icon: LucideIcons.navigation, block: true,
              onPressed: () => openDirections(context, hospital['latitude'], hospital['longitude']))),
        ]),
      ]),
    );
  }
}
