import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../providers/locale_provider.dart';
import '../services/api_service.dart';
import '../theme/rr_theme.dart';
import '../widgets/rr.dart';
import 'home_screen.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  List<dynamic>? _alerts; // null = first load
  bool _refreshing = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _refreshing = _alerts != null;
      _failed = false;
    });
    try {
      final list = await ApiService.getList('/user/notifications', auth: true, cacheKey: 'alerts');
      if (!mounted) return;
      setState(() => _alerts = list);
      markAlertsSeen(list);
    } on SessionExpiredException {
      // handled by the session dialog
    } catch (_) {
      final cached = await ApiService.cached('alerts');
      if (!mounted) return;
      setState(() {
        if (cached is List) _alerts ??= cached;
        _failed = _alerts == null;
      });
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;

    return Column(children: [
      RRTopBar(title: s.alertsTitle, actions: [
        RRIconButton(icon: LucideIcons.refreshCw, label: s.pullToRefresh, onPressed: _load),
      ]),
      RROfflineBanner(onRetry: _load),
      if (_refreshing)
        Container(
          height: 40,
          color: c.primaryContainer,
          alignment: Alignment.center,
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(LucideIcons.loader, size: 18, color: c.onPrimaryContainer),
            const SizedBox(width: 8),
            Text(s.refreshing, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: c.onPrimaryContainer)),
          ]),
        ),
      Expanded(child: _body(context)),
    ]);
  }

  Widget _body(BuildContext context) {
    final s = context.s;
    final alerts = _alerts;
    if (alerts == null && !_failed) return const RRSkeletonList();
    if (_failed) {
      return RRStateView(
        icon: LucideIcons.triangleAlert, title: s.reportsErrBody, error: true, topPadding: 56,
        action: RRButton(s.tryAgain, icon: LucideIcons.refreshCw, onPressed: _load),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: context.rr.primary,
      child: alerts!.isEmpty
          ? ListView(children: [
              RRStateView(icon: LucideIcons.bell, title: s.noAlerts, body: s.noAlertsBody, topPadding: 64),
            ])
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: alerts.length + 1,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) {
                if (i == alerts.length) {
                  return Text(s.pullToRefresh, textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, height: 18 / 13, color: context.rr.textSecondary));
                }
                return AlertCard(alert: alerts[i]);
              },
            ),
    );
  }
}

class AlertCard extends StatelessWidget {
  final dynamic alert;
  const AlertCard({super.key, required this.alert});

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final category = alert['category'] as String? ?? 'GeneralAwareness';
    final date = DateTime.tryParse(alert['sentAt'] ?? '');
    final dateText = date == null ? '' : s.dayMonth(date);

    if (category == 'OutbreakAlert') {
      return Semantics(
        container: true,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: c.dangerContainer, border: Border.all(color: c.danger, width: 2),
              borderRadius: BorderRadius.circular(RRRadius.lg)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Align(alignment: Alignment.centerLeft, child: RRBadge(tone: RRTone.dangerSolid, icon: LucideIcons.siren, text: s.status(category), large: true))),
              const SizedBox(width: 8),
              Text(dateText, style: t.bodySmall?.copyWith(color: c.onDangerContainer)),
            ]),
            const SizedBox(height: 8),
            Text(alert['title'] ?? '', style: t.titleMedium?.copyWith(color: c.onDangerContainer)),
            const SizedBox(height: 8),
            Text(alert['body'] ?? '', style: t.bodyMedium?.copyWith(color: c.onDangerContainer)),
          ]),
        ),
      );
    }
    return RRCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Align(alignment: Alignment.centerLeft, child: RRBadge.of(RRStatus.notice, category, s))),
          const SizedBox(width: 8),
          Text(dateText, style: t.bodySmall?.copyWith(color: c.textSecondary)),
        ]),
        const SizedBox(height: 8),
        Text(alert['title'] ?? '', style: const TextStyle(fontSize: 17, height: 24 / 17, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text(alert['body'] ?? '', style: t.bodyMedium?.copyWith(color: c.textSecondary)),
      ]),
    );
  }
}
