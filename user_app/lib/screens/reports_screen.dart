import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/bite_report.dart';
import '../providers/locale_provider.dart';
import '../services/api_service.dart';
import '../theme/rr_theme.dart';
import '../widgets/rr.dart';
import 'home_screen.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  List<BiteReport>? _reports;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  List<BiteReport> _parse(List<dynamic> data) =>
      data.map((e) => BiteReport.fromJson(e as Map<String, dynamic>)).toList();

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _failed = false;
    });
    try {
      final data = await ApiService.getList('/user/reports', auth: true, cacheKey: 'reports');
      if (mounted) setState(() => _reports = _parse(data));
    } on SessionExpiredException {
      // handled by the session dialog
    } catch (_) {
      // Offline: fall back to the last saved list.
      final cached = await ApiService.cached('reports');
      if (!mounted) return;
      setState(() {
        if (cached is List) _reports ??= _parse(cached);
        _failed = _reports == null;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    return Column(children: [
      RRTopBar(title: s.reportsTitle, actions: [
        RRIconButton(icon: LucideIcons.refreshCw, label: s.pullToRefresh, onPressed: _load),
      ]),
      RROfflineBanner(onRetry: _load),
      Expanded(child: _body(context)),
    ]);
  }

  Widget _body(BuildContext context) {
    final s = context.s;
    final reports = _reports;
    if (reports == null && _loading) return const RRSkeletonList(count: 2);
    if (_failed) {
      return RRStateView(
        icon: LucideIcons.triangleAlert, title: s.reportsErr, body: s.reportsErrBody, error: true, topPadding: 56,
        action: RRButton(s.tryAgain, icon: LucideIcons.refreshCw, onPressed: _load),
      );
    }
    if (reports!.isEmpty) {
      return RRStateView(
        icon: LucideIcons.fileText, title: s.noReports, body: s.noReportsBody, topPadding: 56,
        action: RRButton(s.noReportsBtn, icon: LucideIcons.siren, kind: RRButtonKind.emergency, onPressed: () => openReport(context)),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: context.rr.primary,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: reports.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) => _ReportCard(report: reports[i]),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final BiteReport report;
  const _ReportCard({required this.report});

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    return RRCard(
      onTap: () => showReportDetail(context, report),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
          Text(report.victimName, style: const TextStyle(fontSize: 17, height: 24 / 17, fontWeight: FontWeight.w600)),
          RRBadge.of(RRStatus.report, report.status, s),
        ]),
        const SizedBox(height: 8),
        Text('${s.status(report.severity)} · ${s.status(report.animalType)}', style: t.bodyMedium?.copyWith(color: c.textSecondary)),
        const SizedBox(height: 8),
        Row(children: [
          Icon(LucideIcons.hospital, size: 16, color: c.textSecondary),
          const SizedBox(width: 6),
          Expanded(child: Text(report.hospitalName ?? s.waiting, style: t.bodySmall)),
          Text(reportNumber(report.id), style: TextStyle(fontFamily: 'monospace', fontSize: 12, color: c.textSecondary)),
        ]),
      ]),
    );
  }
}

void showReportDetail(BuildContext context, BiteReport report) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: false,
    builder: (_) => FractionallySizedBox(heightFactor: 0.88, child: _ReportDetail(report: report)),
  );
}

class _ReportDetail extends StatelessWidget {
  final BiteReport report;
  const _ReportDetail({required this.report});

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 8, 0),
        child: Column(children: [
          Container(width: 40, height: 4, decoration: BoxDecoration(color: c.borderStrong, borderRadius: BorderRadius.circular(RRRadius.pill))),
          Row(children: [
            Expanded(
              child: Text.rich(TextSpan(style: t.titleMedium, children: [
                TextSpan(text: '${report.victimName} · '),
                TextSpan(text: reportNumber(report.id),
                    style: TextStyle(fontFamily: 'monospace', fontSize: 14, fontWeight: FontWeight.w400, color: c.textSecondary)),
              ])),
            ),
            RRIconButton(icon: LucideIcons.x, label: s.close, onPressed: () => Navigator.pop(context)),
          ]),
        ]),
      ),
      Expanded(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: c.surfaceAlt, borderRadius: BorderRadius.circular(RRRadius.md)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                RRBadge.of(RRStatus.report, report.status, s, large: true),
                const SizedBox(height: 8),
                Text(s.explain(report.status)),
              ]),
            ),
            const SizedBox(height: 14),
            if (report.status != 'Cancelled') ...[
              _VaccineCard(report: report),
              const SizedBox(height: 14),
            ],
            _Row(s.victim, Text(report.victimName, style: const TextStyle(fontWeight: FontWeight.w600))),
            _Row(s.contact, Text(report.contactNumber)),
            _Row(s.animal, Text(s.status(report.animalType))),
            _Row(s.severity, Align(alignment: Alignment.centerLeft, child: RRBadge.of(RRStatus.severity, report.severity, s))),
            _Row(s.hospital, Text(report.hospitalName ?? s.waiting)),
            if (report.description != null && report.description!.isNotEmpty)
              _Row(s.description, Text(report.description!)),
            if (report.hasPhoto)
              _Row(s.photo, Align(
                alignment: Alignment.centerLeft,
                child: RRButton(s.viewPhoto, icon: LucideIcons.image, kind: RRButtonKind.secondary,
                    onPressed: () => _showPhoto(context, report.id)),
              )),
            if (report.voiceSeconds != null)
              _Row(s.voiceAttached, Row(children: [
                const Icon(LucideIcons.mic, size: 16),
                const SizedBox(width: 6),
                Text('${report.voiceSeconds! ~/ 60}:${(report.voiceSeconds! % 60).toString().padLeft(2, '0')}'),
              ])),
          ],
        ),
      ),
    ]);
  }
}

class _Row extends StatelessWidget {
  final String label;
  final Widget value;
  const _Row(this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 88),
            child: Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Text(label, style: TextStyle(color: context.rr.textSecondary)),
            ),
          ),
          Expanded(child: value),
        ]),
      );
}

class _VaccineCard extends StatelessWidget {
  final BiteReport report;
  const _VaccineCard({required this.report});

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final doses = report.doses;
    final givenCount = doses.where((d) => d.givenDate != null).length;
    final nextIdx = doses.indexWhere((d) => d.givenDate == null);
    final start = doses.isEmpty ? null : doses.first.scheduledDate;
    int dayOf(VaccineDose d) => d.scheduledDate.difference(start!).inDays;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(border: Border.all(color: c.border), borderRadius: BorderRadius.circular(RRRadius.lg)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Icon(LucideIcons.syringe, size: 20),
          const SizedBox(width: 8),
          Text(s.vaccineSchedule, style: t.titleSmall),
        ]),
        const SizedBox(height: 12),
        if (doses.isEmpty)
          Text(s.noScheduleYet, style: t.bodyMedium?.copyWith(color: c.textSecondary))
        else ...[
          if (nextIdx >= 0) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(color: c.primary, borderRadius: BorderRadius.circular(RRRadius.md)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${s.nextDose} · ${s.day(dayOf(doses[nextIdx]))}', style: t.bodySmall?.copyWith(color: c.onPrimary)),
                Text(s.shortDate(doses[nextIdx].scheduledDate),
                    style: TextStyle(fontSize: 22, height: 30 / 22, fontWeight: FontWeight.w600, color: c.onPrimary)),
              ]),
            ),
            const SizedBox(height: 12),
          ],
          Semantics(
            label: s.dosesGiven(givenCount, doses.length),
            excludeSemantics: true,
            child: Row(children: [
              for (var i = 0; i < doses.length; i++) ...[
                if (i > 0) const SizedBox(width: 4),
                Expanded(
                  child: Container(
                    height: 8,
                    decoration: BoxDecoration(
                      color: doses[i].givenDate != null ? c.success : i == nextIdx ? c.primaryBorder : c.border,
                      borderRadius: BorderRadius.circular(RRRadius.pill),
                    ),
                  ),
                ),
              ],
            ]),
          ),
          const SizedBox(height: 6),
          Text(s.dosesGiven(givenCount, doses.length), style: t.labelLarge),
          const SizedBox(height: 8),
          for (var i = 0; i < doses.length; i++)
            Container(
              constraints: const BoxConstraints(minHeight: 48),
              padding: const EdgeInsets.symmetric(vertical: 6),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: c.border))),
              child: Row(children: [
                SizedBox(width: 64, child: Text(s.day(dayOf(doses[i])), style: t.labelLarge)),
                const SizedBox(width: 10),
                Expanded(child: Text('${s.scheduled}: ${s.shortDate(doses[i].scheduledDate)}',
                    style: t.bodySmall?.copyWith(color: c.textSecondary))),
                const SizedBox(width: 10),
                if (doses[i].givenDate != null)
                  RRBadge(tone: RRTone.success, icon: LucideIcons.circleCheck, text: s.given)
                else if (i == nextIdx)
                  RRBadge(tone: RRTone.primary, icon: LucideIcons.clock, text: s.due)
                else
                  RRBadge(tone: RRTone.neutral, icon: LucideIcons.calendar, text: s.upcoming),
              ]),
            ),
        ],
      ]),
    );
  }
}

/// Loads the wound photo only when asked (saves data on 2G).
void _showPhoto(BuildContext context, int reportId) {
  final s = context.read<LocaleProvider>().s;
  showDialog<void>(
    context: context,
    builder: (dialogContext) => Dialog(
      insetPadding: const EdgeInsets.all(16),
      clipBehavior: Clip.antiAlias,
      child: FutureBuilder<Uint8List>(
        future: ApiService.getBytes('/reports/$reportId/photo'),
        builder: (context, snap) {
          final body = snap.hasData
              ? InteractiveViewer(child: Image.memory(snap.data!, fit: BoxFit.contain, cacheWidth: 1080))
              : snap.hasError
                  ? RRStateView(icon: LucideIcons.triangleAlert, title: s.photoLoadFailed, error: true, topPadding: 24)
                  : const SizedBox(height: 240, child: Center(child: CircularProgressIndicator()));
          return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Flexible(child: body),
            Padding(
              padding: const EdgeInsets.all(12),
              child: RRButton(s.close, kind: RRButtonKind.secondary, block: true, onPressed: () => Navigator.pop(dialogContext)),
            ),
          ]);
        },
      ),
    ),
  );
}
