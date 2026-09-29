import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/city_stats.dart';
import '../providers/auth_provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';
import '../theme/rr_theme.dart';
import '../widgets/rr.dart';
import 'alerts_screen.dart';
import 'city_stats_screen.dart';
import 'info_screen.dart';
import 'precautions_screen.dart';
import 'report_screen.dart';
import 'reports_screen.dart';

/// Selected bottom-nav tab; other screens set it (e.g. "Back to Home").
final homeTab = ValueNotifier<int>(0);

/// Unread alert count shown on the Alerts tab.
final unreadAlerts = ValueNotifier<int>(0);
const _lastSeenAlertKey = 'last_seen_alert_id';

Future<void> refreshUnreadAlerts() async {
  try {
    final list = await ApiService.getList('/user/notifications', auth: true, cacheKey: 'alerts');
    final prefs = await SharedPreferences.getInstance();
    final lastSeen = prefs.getInt(_lastSeenAlertKey) ?? 0;
    unreadAlerts.value = list.where((n) => (n['id'] as int) > lastSeen).length;
  } catch (_) {}
}

Future<void> markAlertsSeen(List<dynamic> alerts) async {
  if (alerts.isEmpty) return;
  final newest = alerts.map((n) => n['id'] as int).reduce((a, b) => a > b ? a : b);
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt(_lastSeenAlertKey, newest);
  unreadAlerts.value = 0;
}

void openReport(BuildContext context) =>
    Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportScreen()));

void openStats(BuildContext context) =>
    Navigator.push(context, MaterialPageRoute(builder: (_) => const CityStatsScreen()));

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    homeTab.value = 0;
    refreshUnreadAlerts();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: homeTab,
      builder: (context, tab, _) => Scaffold(
        // Only the visible tab is built — keeps memory low on cheap phones.
        body: switch (tab) {
          1 => const InfoScreen(),
          2 => const PrecautionsScreen(),
          3 => const AlertsScreen(),
          4 => const ReportsScreen(),
          _ => const _HomeTab(),
        },
        bottomNavigationBar: _BottomNav(current: tab, onTap: (i) => homeTab.value = i),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int current;
  final ValueChanged<int> onTap;
  const _BottomNav({required this.current, required this.onTap});

  static const _icons = [LucideIcons.house, LucideIcons.bookOpen, LucideIcons.shieldCheck, LucideIcons.bell, LucideIcons.fileText];

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    final s = context.s;
    return Container(
      decoration: BoxDecoration(color: c.surface, border: Border(top: BorderSide(color: c.border))),
      child: SafeArea(
        top: false,
        child: Row(children: [
          for (var i = 0; i < 5; i++)
            Expanded(
              child: Semantics(
                button: true,
                selected: i == current,
                label: s.nav[i],
                excludeSemantics: true,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onTap(i),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 64),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(2, 8, 2, 6),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Stack(clipBehavior: Clip.none, children: [
                          Container(
                            width: 52, height: 28,
                            decoration: BoxDecoration(
                              color: i == current ? c.primaryContainer : Colors.transparent,
                              borderRadius: BorderRadius.circular(RRRadius.pill),
                            ),
                            child: Icon(_icons[i], size: 22, color: i == current ? c.primary : c.textSecondary),
                          ),
                          if (i == 3)
                            ValueListenableBuilder<int>(
                              valueListenable: unreadAlerts,
                              builder: (_, n, __) => n == 0
                                  ? const SizedBox.shrink()
                                  : Positioned(
                                      top: -4, left: 34,
                                      child: Container(
                                        constraints: const BoxConstraints(minWidth: 18),
                                        padding: const EdgeInsets.symmetric(horizontal: 5),
                                        decoration: BoxDecoration(color: c.emergency, borderRadius: BorderRadius.circular(RRRadius.pill)),
                                        child: Text('$n', textAlign: TextAlign.center,
                                            style: TextStyle(fontSize: 11, height: 18 / 11, fontWeight: FontWeight.w600, color: c.onEmergency)),
                                      ),
                                    ),
                            ),
                        ]),
                        const SizedBox(height: 2),
                        // Scale long labels down rather than breaking a word across lines.
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(s.nav[i], maxLines: 1, textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, height: 16 / 12,
                                  fontWeight: i == current ? FontWeight.w600 : FontWeight.w400,
                                  color: i == current ? c.primary : c.textSecondary)),
                        ),
                      ]),
                    ),
                  ),
                ),
              ),
            ),
        ]),
      ),
    );
  }
}

class _HomeTab extends StatefulWidget {
  const _HomeTab();

  @override
  State<_HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<_HomeTab> {
  CityStats? _stats;
  bool _statsFailed = false;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _statsFailed = false);
    try {
      final json = await ApiService.get('/user/city-stats', auth: true, cacheKey: 'city-stats');
      if (mounted) setState(() => _stats = CityStats.fromJson(json));
    } catch (_) {
      final cached = await ApiService.cached('city-stats');
      if (!mounted) return;
      setState(() {
        if (cached is Map<String, dynamic>) _stats = CityStats.fromJson(cached);
        _statsFailed = _stats == null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final user = context.watch<AuthProvider>().user;
    final theme = context.watch<ThemeProvider>();
    final firstName = (user?.fullName ?? '').split(' ').first;

    return Column(children: [
      RRTopBar(
        title: s.app,
        subtitle: s.city,
        leading: const RRLogoSlot(size: 32, showText: false),
        actions: [
          // Shows the language it switches to ("हिंदी" / "English"), like the login screen.
          Semantics(
            button: true,
            label: s.langBtn,
            child: TextButton(
              onPressed: context.read<LocaleProvider>().toggle,
              style: TextButton.styleFrom(
                minimumSize: const Size(44, 44),
                padding: const EdgeInsets.symmetric(horizontal: 8),
                foregroundColor: c.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999), side: BorderSide(color: c.borderStrong)),
                visualDensity: VisualDensity.compact,
              ),
              child: Text(s.langBtn, style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(width: 4),
          RRIconButton(icon: LucideIcons.chartColumn, label: s.cityStats, onPressed: () => openStats(context)),
          RRIconButton(
            icon: theme.isDark(context) ? LucideIcons.sun : LucideIcons.moon,
            label: s.changeTheme,
            onPressed: () => theme.toggleTheme(context),
          ),
          RRIconButton(icon: LucideIcons.logOut, label: s.logout, onPressed: () => context.read<AuthProvider>().logout()),
        ],
      ),
      RROfflineBanner(onRetry: () {
        _loadStats();
        refreshUnreadAlerts();
      }),
      Expanded(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (firstName.isNotEmpty) Text(s.hello(firstName), style: t.bodyMedium?.copyWith(color: c.textSecondary)),
            const SizedBox(height: 16),
            _EmergencyCard(onTap: () => openReport(context)),
            const SizedBox(height: 16),
            IntrinsicHeight(
              child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Expanded(
                  child: _QuickCard(
                    icon: LucideIcons.shieldCheck, title: s.prec, subtitle: s.precSub,
                    bg: c.secondaryContainer, fg: c.onSecondaryContainer, onTap: () => homeTab.value = 2,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickCard(
                    icon: LucideIcons.bookOpen, title: s.info, subtitle: s.infoSub,
                    bg: c.primaryContainer, fg: c.onPrimaryContainer, onTap: () => homeTab.value = 1,
                  ),
                ),
              ]),
            ),
            const SizedBox(height: 16),
            if (!_statsFailed) _casesCard(context),
          ],
        ),
      ),
    ]);
  }

  Widget _casesCard(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final st = _stats;
    final pct = st?.changePercent ?? 0;
    final trendColor = pct > 0 ? c.danger : pct < 0 ? c.success : c.textSecondary;
    return RRCard(
      onTap: () => openStats(context),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(s.casesInCity, style: t.labelMedium?.copyWith(color: c.textSecondary)),
            const SizedBox(height: 2),
            if (st == null) ...[
              const SizedBox(height: 6),
              const RRSkeleton(width: 64, height: 32),
              const SizedBox(height: 8),
              const RRSkeleton(width: 160),
            ] else ...[
              Wrap(crossAxisAlignment: WrapCrossAlignment.end, spacing: 8, children: [
                Text('${st.totalCasesThisMonth}', style: const TextStyle(fontSize: 32, height: 40 / 32, fontWeight: FontWeight.w600)),
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(s.casesSub, style: t.bodySmall?.copyWith(color: c.textSecondary)),
                ),
              ]),
              const SizedBox(height: 2),
              Row(children: [
                Icon(pct > 0 ? LucideIcons.trendingUp : pct < 0 ? LucideIcons.trendingDown : LucideIcons.activity,
                    size: 16, color: trendColor),
                const SizedBox(width: 4),
                Flexible(child: Text(s.trendVsLastMonth(pct), style: t.labelMedium?.copyWith(color: trendColor))),
              ]),
            ],
          ]),
        ),
        Icon(LucideIcons.chevronRight, color: c.textSecondary),
      ]),
    );
  }
}

class _EmergencyCard extends StatefulWidget {
  final VoidCallback onTap;
  const _EmergencyCard({required this.onTap});

  @override
  State<_EmergencyCard> createState() => _EmergencyCardState();
}

class _EmergencyCardState extends State<_EmergencyCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    return Semantics(
      button: true,
      label: '${s.bigBtn}. ${s.bigSub}',
      excludeSemantics: true,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _pressed = true),
        onTapCancel: () => setState(() => _pressed = false),
        onTapUp: (_) => setState(() => _pressed = false),
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: RRMotion.fast,
          constraints: const BoxConstraints(minHeight: 168),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: _pressed ? c.emergencyPressed : c.emergency,
            borderRadius: BorderRadius.circular(RRRadius.xl),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
            Row(children: [
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(shape: BoxShape.circle, color: c.onEmergency),
                child: Icon(LucideIcons.siren, size: 28, color: c.emergency),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(s.bigBtn,
                    style: TextStyle(fontSize: 26, height: 32 / 26, fontWeight: FontWeight.w600, color: c.onEmergency)),
              ),
              Icon(LucideIcons.chevronRight, size: 28, color: c.onEmergency),
            ]),
            const SizedBox(height: 10),
            Text(s.bigSub, style: TextStyle(fontSize: 16, height: 24 / 16, color: c.onEmergency)),
          ]),
        ),
      ),
    );
  }
}

class _QuickCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color bg;
  final Color fg;
  final VoidCallback onTap;
  const _QuickCard({required this.icon, required this.title, required this.subtitle, required this.bg, required this.fg, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    return RRCard(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 96),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(shape: BoxShape.circle, color: bg),
            child: Icon(icon, size: 24, color: fg),
          ),
          const SizedBox(height: 10),
          Text(title, style: const TextStyle(fontSize: 17, height: 24 / 17, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(subtitle, style: TextStyle(fontSize: 14, height: 20 / 14, color: c.textSecondary)),
        ]),
      ),
    );
  }
}
