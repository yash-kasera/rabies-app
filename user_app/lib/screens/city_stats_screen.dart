import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../l10n/strings.dart';
import '../models/city_stats.dart';
import '../models/hospital_model.dart';
import '../providers/locale_provider.dart';
import '../services/api_service.dart';
import '../theme/rr_theme.dart';
import '../widgets/rr.dart';
import '../widgets/tehsil_map.dart';
import 'home_screen.dart';
import 'submitted_screen.dart';

const _enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

class CityStatsScreen extends StatefulWidget {
  const CityStatsScreen({super.key});

  @override
  State<CityStatsScreen> createState() => _CityStatsScreenState();
}

class _CityStatsScreenState extends State<CityStatsScreen> {
  CityStats? _stats;
  List<HospitalModel> _hospitals = [];
  TehsilGeo? _geo;
  bool _geoFailed = false;
  bool _loading = true;
  bool _failed = false;
  String? _selectedArea;
  bool _areaList = false; // Map (default) or List for tehsils
  bool _hospitalMap = false; // List (default) or Map for hospitals
  bool _mapLoaded = false; // tiles load only when the user asks

  @override
  void initState() {
    super.initState();
    _loadGeo();
    _load();
  }

  void _loadGeo() {
    setState(() => _geoFailed = false);
    TehsilGeo.load().then((g) {
      if (mounted) setState(() => _geo = g);
    }, onError: (_) {
      if (mounted) setState(() => _geoFailed = true);
    });
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _failed = false;
    });
    try {
      final results = await Future.wait([
        ApiService.get('/user/city-stats', auth: true, cacheKey: 'city-stats'),
        ApiService.getList('/user/hospitals', auth: true, cacheKey: 'hospitals'),
      ]);
      if (!mounted) return;
      _apply(results[0] as Map<String, dynamic>, results[1] as List);
    } on SessionExpiredException {
      // handled by the session dialog
    } catch (_) {
      final stats = await ApiService.cached('city-stats');
      final hospitals = await ApiService.cached('hospitals');
      if (!mounted) return;
      if (stats is Map<String, dynamic> && _stats == null) _apply(stats, hospitals is List ? hospitals : const []);
      setState(() => _failed = _stats == null);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _apply(Map<String, dynamic> stats, List hospitals) {
    setState(() {
      _stats = CityStats.fromJson(stats);
      _hospitals = hospitals.map((e) => HospitalModel.fromJson(e as Map<String, dynamic>)).toList();
      _selectedArea ??= _stats!.areas.isEmpty ? null : _stats!.areas.first.name;
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    return Scaffold(
      appBar: RRTopBar(title: s.statsTitle, back: true),
      body: Column(children: [
        RROfflineBanner(onRetry: _load),
        Expanded(child: _body(context)),
      ]),
    );
  }

  Widget _body(BuildContext context) {
    final s = context.s;
    final st = _stats;
    if (st == null && _loading) return const RRSkeletonList(count: 3);
    if (_failed || st == null) {
      return RRStateView(
        icon: LucideIcons.triangleAlert, title: s.statsErr, body: s.reportsErrBody, error: true, topPadding: 56,
        action: RRButton(s.tryAgain, icon: LucideIcons.refreshCw, onPressed: _load),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: context.rr.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _statTiles(context, st),
          const SizedBox(height: 16),
          if (st.areas.isNotEmpty) ...[_areasCard(context, st), const SizedBox(height: 16)],
          _trendCard(context, st),
          if (st.activeNotices.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(s.activeNotices, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            _noticeList(context, st.activeNotices.take(2).toList()),
          ],
          const SizedBox(height: 16),
          _hospitalsSection(context),
        ],
      ),
    );
  }

  Widget _statTiles(BuildContext context, CityStats st) {
    final s = context.s;
    final c = context.rr;
    final pct = st.changePercent;
    final color = pct > 0 ? c.danger : pct < 0 ? c.success : c.textSecondary;
    Widget tile(String label, Widget value) => RRCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: c.textSecondary)),
            const SizedBox(height: 4),
            value,
          ]),
        );
    const statStyle = TextStyle(fontSize: 32, height: 40 / 32, fontWeight: FontWeight.w600, fontFeatures: [FontFeature.tabularFigures()]);
    return Column(children: [
      IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Expanded(child: tile(s.casesThisMonth, Text('${st.totalCasesThisMonth}', style: statStyle))),
          const SizedBox(width: 12),
          Expanded(child: tile(s.regHospitals, Text('${st.registeredHospitals}', style: statStyle))),
        ]),
      ),
      const SizedBox(height: 12),
      SizedBox(
        width: double.infinity,
        child: tile(
          s.changeVsLast,
          Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(pct > 0 ? LucideIcons.trendingUp : pct < 0 ? LucideIcons.trendingDown : LucideIcons.activity, size: 28, color: color),
              const SizedBox(width: 6),
              Text('${pct > 0 ? '+' : ''}$pct%', style: statStyle.copyWith(color: color)),
            ]),
            Text(s.changeText(pct), style: TextStyle(fontWeight: FontWeight.w600, color: color)),
          ]),
        ),
      ),
    ]);
  }

  Widget _areasCard(BuildContext context, CityStats st) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final counts = {for (final a in st.areas) a.name: a.count};
    final sel = st.areas.firstWhere((a) => a.name == _selectedArea, orElse: () => st.areas.first);
    final band = bandFor(sel.count, dark);
    final max = st.areas.map((a) => a.count).fold<int>(1, (m, n) => n > m ? n : m);

    return RRCard(
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 4, 4, 0),
          child: Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, runSpacing: 8, children: [
            Text(s.byTehsil, style: t.titleSmall),
            RRSegmented<bool>(
              height: 40,
              value: _areaList,
              onChanged: (v) => setState(() => _areaList = v),
              options: [(false, s.map, null), (true, s.list, null)],
            ),
          ]),
        ),
        const SizedBox(height: 12),
        if (!_areaList) ...[
          if (_geoFailed)
            RRStateView(
              icon: LucideIcons.map, title: s.mapLoadFailed, error: true, topPadding: 8,
              action: RRButton(s.retry, icon: LucideIcons.refreshCw, kind: RRButtonKind.secondary, onPressed: _loadGeo),
            )
          else ...[
            _mapBox(context, _geo?.district, counts, sel.name, s.mapLabel, 340 / 238),
            const SizedBox(height: 12),
            Text(s.cityView, style: t.labelLarge),
            const SizedBox(height: 8),
            _mapBox(context, _geo?.city, counts, sel.name, s.cityView, 340 / 280),
            const SizedBox(height: 6),
            Text(s.approxNote, style: t.bodySmall?.copyWith(color: c.textSecondary)),
          ],
          const SizedBox(height: 12),
          _legend(context, dark),
          const SizedBox(height: 12),
          Semantics(
            liveRegion: true,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(border: Border.all(color: c.border), borderRadius: BorderRadius.circular(RRRadius.md)),
              child: Row(children: [
                Container(
                  constraints: const BoxConstraints(minWidth: 48), height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 6), alignment: Alignment.center,
                  decoration: BoxDecoration(color: band.$2, borderRadius: BorderRadius.circular(RRRadius.sm)),
                  child: Text('${sel.count}', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: band.$3)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${s.tehsil(sel.name)} · ${sel.count} ${s.cases}', style: t.labelLarge),
                    _deltaRow(context, sel.delta, s),
                  ]),
                ),
              ]),
            ),
          ),
        ] else
          Column(children: [
            for (final a in [...st.areas]..sort((x, y) => y.count.compareTo(x.count)))
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      Text(s.tehsil(a.name), style: t.labelLarge),
                      const SizedBox(height: 4),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          widthFactor: (a.count / max).clamp(0.02, 1.0),
                          child: Container(height: 6, decoration: BoxDecoration(
                              color: bandFor(a.count, dark).$2, border: Border.all(color: c.orangeBorder),
                              borderRadius: BorderRadius.circular(RRRadius.pill))),
                        ),
                      ),
                    ]),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(width: 40, child: Text('${a.count}', textAlign: TextAlign.right,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, fontFeatures: [FontFeature.tabularFigures()]))),
                ]),
              ),
          ]),
      ]),
    );
  }

  Widget _mapBox(BuildContext context, TehsilView? view, Map<String, int> counts, String selected, String label, double ratio) {
    final c = context.rr;
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(color: c.surfaceAlt, borderRadius: BorderRadius.circular(RRRadius.md)),
      child: view == null
          ? AspectRatio(aspectRatio: ratio, child: const SizedBox())
          : TehsilMap(
              view: view, counts: counts, selected: selected, label: context.s.tehsil, semanticLabel: label,
              onSelect: (name) => setState(() => _selectedArea = name),
            ),
    );
  }

  Widget _deltaRow(BuildContext context, int d, S s) {
    final c = context.rr;
    final color = d > 0 ? c.danger : d < 0 ? c.success : c.textSecondary;
    return Row(children: [
      Icon(d > 0 ? LucideIcons.trendingUp : d < 0 ? LucideIcons.trendingDown : LucideIcons.activity, size: 16, color: color),
      const SizedBox(width: 4),
      Flexible(child: Text(s.areaDelta(d), style: Theme.of(context).textTheme.labelMedium?.copyWith(color: color))),
    ]);
  }

  Widget _legend(BuildContext context, bool dark) {
    final s = context.s;
    final c = context.rr;
    final bands = tehsilBands(dark);
    final small = TextStyle(fontSize: 12, height: 16 / 12, color: c.textSecondary);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Wrap(spacing: 12, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
        Text(s.legend, style: small.copyWith(fontWeight: FontWeight.w600)),
        Row(mainAxisSize: MainAxisSize.min, children: [
          for (var i = 0; i < bands.length; i++)
            Padding(
              padding: const EdgeInsets.only(right: 2),
              child: Column(children: [
                Container(width: 28, height: 10, decoration: BoxDecoration(color: bands[i].$2, borderRadius: BorderRadius.circular(2))),
                const SizedBox(height: 2),
                Text(i == bands.length - 1 ? '${bands[i].$1}+' : '${bands[i].$1}–${bands[i + 1].$1 - 1}', style: small),
              ]),
            ),
        ]),
        Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 12, height: 12, decoration: BoxDecoration(
              color: c.surface, shape: BoxShape.circle, border: Border.all(color: c.textPrimary, width: 2))),
          const SizedBox(width: 6),
          Text(s.cityMarker, style: small),
        ]),
      ]),
    );
  }

  Widget _trendCard(BuildContext context, CityStats st) {
    final s = context.s;
    final c = context.rr;
    final max = st.trend.map((p) => p.count).fold<int>(1, (m, n) => n > m ? n : m);
    String month(String en) {
      final i = _enMonths.indexOf(en);
      return i < 0 ? en : s.monthShort(i + 1);
    }
    final small = TextStyle(fontSize: 12, height: 16 / 12, color: c.textSecondary);
    return RRCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(s.last6, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 12),
        Semantics(
          label: st.trend.map((p) => '${month(p.month)} ${p.count}').join(', '),
          excludeSemantics: true,
          child: Container(
            height: 148,
            padding: const EdgeInsets.only(bottom: 4),
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.borderStrong))),
            child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              for (var i = 0; i < st.trend.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                    Text('${st.trend[i].count}', style: small.copyWith(fontWeight: FontWeight.w600, color: c.textPrimary)),
                    const SizedBox(height: 4),
                    Container(
                      constraints: const BoxConstraints(maxWidth: 32),
                      height: (st.trend[i].count / max * 96).clamp(2, 96).toDouble(),
                      decoration: BoxDecoration(
                        color: i == st.trend.length - 1 ? c.primary : c.primaryBorder,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                      ),
                    ),
                  ]),
                ),
              ],
            ]),
          ),
        ),
        const SizedBox(height: 6),
        Row(children: [
          for (var i = 0; i < st.trend.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(child: Text(month(st.trend[i].month), textAlign: TextAlign.center, style: small)),
          ],
        ]),
      ]),
    );
  }

  Widget _noticeList(BuildContext context, List<dynamic> notices) {
    final s = context.s;
    final c = context.rr;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: c.surface, border: Border.all(color: c.border), borderRadius: BorderRadius.circular(RRRadius.lg)),
      child: Column(children: [
        for (var i = 0; i < notices.length; i++)
          RRCard(
            radius: 0,
            borderColor: Colors.transparent,
            padding: EdgeInsets.zero,
            onTap: () {
              homeTab.value = 3;
              Navigator.of(context).popUntil((r) => r.isFirst);
            },
            child: Container(
              constraints: const BoxConstraints(minHeight: 64),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(border: i < notices.length - 1 ? Border(bottom: BorderSide(color: c.border)) : null),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(notices[i]['title'] ?? '', style: Theme.of(context).textTheme.labelLarge),
                    const SizedBox(height: 4),
                    RRBadge.of(RRStatus.notice, notices[i]['category'] ?? 'GeneralAwareness', s),
                  ]),
                ),
                Icon(LucideIcons.chevronRight, color: c.textSecondary),
              ]),
            ),
          ),
      ]),
    );
  }

  Widget _hospitalsSection(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, runSpacing: 8, children: [
        Text(s.nearby, style: t.titleMedium),
        if (_hospitals.isNotEmpty)
          RRSegmented<bool>(
            value: _hospitalMap,
            onChanged: (v) => setState(() => _hospitalMap = v),
            options: [(false, s.list, LucideIcons.list), (true, s.map, LucideIcons.map)],
          ),
      ]),
      const SizedBox(height: 12),
      if (_hospitals.isEmpty)
        RRCard(child: RRStateView(icon: LucideIcons.hospital, title: s.noHosp, body: s.noHospBody, topPadding: 0))
      else if (_hospitalMap)
        _hospitalMapView(context)
      else
        Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(color: c.surface, border: Border.all(color: c.border), borderRadius: BorderRadius.circular(RRRadius.lg)),
          child: Column(children: [
            for (var i = 0; i < _hospitals.length; i++)
              Container(
                constraints: const BoxConstraints(minHeight: 64),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(border: i < _hospitals.length - 1 ? Border(bottom: BorderSide(color: c.border)) : null),
                child: Row(children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: c.primaryContainer),
                      child: Icon(LucideIcons.hospital, size: 20, color: c.onPrimaryContainer),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(_hospitals[i].name, style: t.labelLarge),
                        Text(_hospitals[i].address, style: t.bodySmall?.copyWith(color: c.textSecondary)),
                      ]),
                    ),
                    const SizedBox(width: 8),
                    RRButton(s.directions, icon: LucideIcons.navigation, kind: RRButtonKind.secondary,
                        onPressed: () => openDirections(context, _hospitals[i].latitude, _hospitals[i].longitude)),
                ]),
              ),
          ]),
        ),
    ]);
  }

  Widget _hospitalMapView(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    if (!_mapLoaded) {
      return Container(
        constraints: const BoxConstraints(minHeight: 220),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: c.surfaceAlt, border: Border.all(color: c.borderStrong), borderRadius: BorderRadius.circular(RRRadius.lg)),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(s.mapNote, textAlign: TextAlign.center),
          const SizedBox(height: 10),
          RRButton(s.loadMap, icon: LucideIcons.map, kind: RRButtonKind.secondary, onPressed: () => setState(() => _mapLoaded = true)),
        ]),
      );
    }
    final first = _hospitals.first;
    return SizedBox(
      height: 300,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(RRRadius.lg),
        child: FlutterMap(
          options: MapOptions(initialCenter: LatLng(first.latitude, first.longitude), initialZoom: 12),
          children: [
            TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.rabies.user_app'),
            MarkerLayer(markers: [
              for (final h in _hospitals)
                Marker(
                  point: LatLng(h.latitude, h.longitude),
                  width: 40, height: 40,
                  child: Icon(LucideIcons.mapPin, size: 32, color: c.emergency),
                ),
            ]),
          ],
        ),
      ),
    );
  }
}
