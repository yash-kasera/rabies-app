import 'package:flutter/material.dart';
import '../models/bite_report.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class MyReportsScreen extends StatefulWidget {
  const MyReportsScreen({super.key});

  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  List<BiteReport> _reports = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadReports();
  }

  Future<void> _loadReports() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService.getList('/user/reports', auth: true);
      setState(() {
        _reports = data.map((e) => BiteReport.fromJson(e as Map<String, dynamic>)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Reports')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Error: $_error'))
              : _reports.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment_outlined, size: 64, color: Theme.of(context).colorScheme.primary.withOpacity(0.5)),
                          const SizedBox(height: 16),
                          Text('No reports yet', style: Theme.of(context).textTheme.titleLarge),
                          const SizedBox(height: 8),
                          Text('Your bite reports will appear here', style: Theme.of(context).textTheme.bodyMedium),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadReports,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _reports.length,
                        itemBuilder: (context, index) {
                          final report = _reports[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () => _showDetail(report),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(report.victimName, style: Theme.of(context).textTheme.titleMedium),
                                        _StatusBadge(report.status),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text('${_severityLabel(report.severity)} · ${report.animalType}', style: Theme.of(context).textTheme.bodyMedium),
                                    if (report.hospitalName != null) ...[
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Icon(Icons.local_hospital, size: 14, color: Theme.of(context).colorScheme.secondary),
                                          const SizedBox(width: 4),
                                          Text(report.hospitalName!, style: Theme.of(context).textTheme.labelSmall),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  void _showDetail(BiteReport report) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Report Details', style: Theme.of(context).textTheme.headlineMedium),
                _StatusBadge(report.status),
              ],
            ),
            const SizedBox(height: 16),
            _detailRow('Victim', report.victimName),
            _detailRow('Contact', report.contactNumber),
            _detailRow('Animal', report.animalType),
            _detailRow('Severity', _severityLabel(report.severity)),
            if (report.hospitalName != null) _detailRow('Hospital', report.hospitalName!),
            _detailRow('Status', _statusLabel(report.status)),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          Text(value, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }

  String _severityLabel(String s) {
    switch (s) {
      case 'MinorScratch': return 'Minor Scratch';
      case 'BleedingWound': return 'Bleeding Wound';
      case 'DeepWound': return 'Deep Wound';
      case 'MultipleBites': return 'Multiple Bites';
      default: return s;
    }
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'Reported': return 'Reported - Waiting for hospital';
      case 'Accepted': return 'Accepted by hospital';
      case 'UnderTreatment': return 'Under Treatment';
      case 'Completed': return 'Completed';
      case 'Cancelled': return 'Cancelled';
      default: return s;
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge(this.status);

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case 'Reported':
        color = AppColors.warningLight;
        break;
      case 'Accepted':
        color = AppColors.primaryLight;
        break;
      case 'UnderTreatment':
        color = AppColors.secondaryLight;
        break;
      case 'Completed':
        color = AppColors.successLight;
        break;
      case 'Cancelled':
        color = AppColors.dangerLight;
        break;
      default:
        color = AppColors.textSecondaryLight;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(status, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600)),
    );
  }
}