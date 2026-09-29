import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../providers/locale_provider.dart';
import '../theme/rr_theme.dart';
import '../widgets/rr.dart';
import 'home_screen.dart';

class InfoScreen extends StatefulWidget {
  const InfoScreen({super.key});

  @override
  State<InfoScreen> createState() => _InfoScreenState();
}

class _InfoScreenState extends State<InfoScreen> {
  int _open = 0; // first section open by default

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final sections = s.infoSections;

    return Column(children: [
      RRTopBar(title: s.info),
      Expanded(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _EmergencyBanner(label: s.infoBanner),
            const SizedBox(height: 12),
            Container(
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(color: c.surface, border: Border.all(color: c.border), borderRadius: BorderRadius.circular(RRRadius.lg)),
              child: Column(children: [
                for (var i = 0; i < sections.length; i++)
                  Container(
                    decoration: BoxDecoration(border: i < sections.length - 1 ? Border(bottom: BorderSide(color: c.border)) : null),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      Semantics(
                        button: true,
                        expanded: _open == i,
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => setState(() => _open = _open == i ? -1 : i),
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(minHeight: 60),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              child: Row(children: [
                                Expanded(child: Text(sections[i].$1, style: t.titleMedium)),
                                Icon(_open == i ? LucideIcons.chevronUp : LucideIcons.chevronDown, color: c.textSecondary),
                              ]),
                            ),
                          ),
                        ),
                      ),
                      if (_open == i)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                            for (final p in sections[i].$2) ...[
                              Text(p, style: const TextStyle(fontSize: 18, height: 30 / 18)),
                              const SizedBox(height: 12),
                            ],
                            if (sections[i].$2.isEmpty)
                              for (final (myth, fact) in s.myths) ...[
                                _MythCard(myth: myth, fact: fact),
                                const SizedBox(height: 12),
                              ],
                          ]),
                        ),
                    ]),
                  ),
              ]),
            ),
          ],
        ),
      ),
    ]);
  }
}

class _EmergencyBanner extends StatelessWidget {
  final String label;
  const _EmergencyBanner({required this.label});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    return Semantics(
      button: true,
      child: GestureDetector(
        onTap: () => openReport(context),
        child: Container(
          constraints: const BoxConstraints(minHeight: 64),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(color: c.emergency, borderRadius: BorderRadius.circular(RRRadius.lg)),
          child: Row(children: [
            Icon(LucideIcons.siren, size: 24, color: c.onEmergency),
            const SizedBox(width: 8),
            Expanded(child: Text(label, style: Theme.of(context).textTheme.labelLarge?.copyWith(color: c.onEmergency))),
            Icon(LucideIcons.chevronRight, size: 20, color: c.onEmergency),
          ]),
        ),
      ),
    );
  }
}

class _MythCard extends StatelessWidget {
  final String myth;
  final String fact;
  const _MythCard({required this.myth, required this.fact});

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    Widget tag(String text, IconData icon, Color bg, Color fg) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(RRRadius.pill)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 14, color: fg),
            const SizedBox(width: 4),
            Text(text, style: TextStyle(fontSize: 13, height: 22 / 13, fontWeight: FontWeight.w600, color: fg)),
          ]),
        );
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: c.surfaceAlt, borderRadius: BorderRadius.circular(RRRadius.md)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          tag(s.myth, LucideIcons.circleX, c.dangerContainer, c.onDangerContainer),
          const SizedBox(width: 8),
          Expanded(child: Text(myth)),
        ]),
        const SizedBox(height: 6),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          tag(s.fact, LucideIcons.circleCheck, c.successContainer, c.onSuccessContainer),
          const SizedBox(width: 8),
          Expanded(child: Text(fact, style: const TextStyle(fontWeight: FontWeight.w600))),
        ]),
      ]),
    );
  }
}
