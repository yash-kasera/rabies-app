import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../providers/locale_provider.dart';
import '../theme/rr_theme.dart';
import '../widgets/rr.dart';
import 'home_screen.dart';

class PrecautionsScreen extends StatelessWidget {
  const PrecautionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final steps = s.steps;

    return Column(children: [
      RRTopBar(title: s.prec),
      Expanded(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(s.firstAid, style: const TextStyle(fontSize: 22, height: 30 / 22, fontWeight: FontWeight.w600)),
            Text(s.firstAidSub, style: t.bodyMedium?.copyWith(color: c.textSecondary)),
            const SizedBox(height: 12),
            for (var i = 0; i < steps.length; i++) ...[
              if (i > 0) const SizedBox(height: 8),
              _Step(n: i + 1, icon: steps[i].$1, text: steps[i].$2),
            ],
            const SizedBox(height: 20),
            _ListHeading(icon: LucideIcons.circleCheck, text: s.dos, color: c.success),
            const SizedBox(height: 12),
            _BulletBox(items: s.dosList, icon: LucideIcons.check, bg: c.successContainer, fg: c.onSuccessContainer, border: c.successBorder),
            const SizedBox(height: 20),
            _ListHeading(icon: LucideIcons.circleX, text: s.donts, color: c.danger),
            const SizedBox(height: 12),
            _BulletBox(items: s.dontsList, icon: LucideIcons.x, bg: c.dangerContainer, fg: c.onDangerContainer, border: c.dangerBorder),
          ],
        ),
      ),
      Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        decoration: BoxDecoration(color: c.surface, border: Border(top: BorderSide(color: c.border))),
        child: RRButton(s.reportNow, icon: LucideIcons.siren, kind: RRButtonKind.emergency, large: true, block: true,
            onPressed: () => openReport(context)),
      ),
    ]);
  }
}

class _Step extends StatelessWidget {
  final int n;
  final String icon;
  final String text;
  const _Step({required this.n, required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    final warn = icon == 'ban';
    return RRCard(
      padding: const EdgeInsets.all(14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 32, height: 32, alignment: Alignment.center,
          decoration: BoxDecoration(shape: BoxShape.circle, color: c.primary),
          child: Text('$n', style: TextStyle(fontWeight: FontWeight.w600, color: c.onPrimary)),
        ),
        const SizedBox(width: 12),
        Container(
          width: 32, height: 32,
          decoration: BoxDecoration(shape: BoxShape.circle, color: warn ? c.dangerContainer : c.primaryContainer),
          child: Icon(rrIcon(icon), size: 20, color: warn ? c.onDangerContainer : c.onPrimaryContainer),
        ),
        const SizedBox(width: 12),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 18, height: 26 / 18))),
      ]),
    );
  }
}

class _ListHeading extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  const _ListHeading({required this.icon, required this.text, required this.color});

  @override
  Widget build(BuildContext context) => Row(children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 8),
        Text(text, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: color)),
      ]);
}

class _BulletBox extends StatelessWidget {
  final List<String> items;
  final IconData icon;
  final Color bg, fg, border;
  const _BulletBox({required this.items, required this.icon, required this.bg, required this.fg, required this.border});

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(color: bg, border: Border.all(color: border), borderRadius: BorderRadius.circular(RRRadius.lg)),
        child: Column(children: [
          for (var i = 0; i < items.length; i++)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(border: i < items.length - 1 ? Border(bottom: BorderSide(color: border)) : null),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Padding(padding: const EdgeInsets.only(top: 2), child: Icon(icon, size: 20, color: fg)),
                const SizedBox(width: 10),
                Expanded(child: Text(items[i], style: TextStyle(color: fg))),
              ]),
            ),
        ]),
      );
}
