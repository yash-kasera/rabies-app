import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/city_stats.dart';
import '../models/hospital_model.dart';
import '../services/api_service.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:url_launcher/url_launcher.dart';

class CityCasesScreen extends StatefulWidget {
  const CityCasesScreen({super.key});

  @override
  State<CityCasesScreen> createState() => _CityCasesScreenState();
}

class _CityCasesScreenState extends State<CityCasesScreen> {
  CityStats? _stats;
  List<HospitalModel> _hospitals = [];
  bool _loading = true;
  String? _error;
  bool _showMap = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final statsJson = await ApiService.get('/user/city-stats', auth: true, queryParams: {'city_id': '1'});
      final hospitalsList = await ApiService.getList('/user/hospitals', auth: true, queryParams: {'city_id': '1'});
      setState(() {
        _stats = CityStats.fromJson(statsJson);
        _hospitals = hospitalsList.map((e) => HospitalModel.fromJson(e)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _openDirections(double lat, double lng) async {
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cases In My City'),
        actions: [
          if (_hospitals.isNotEmpty)
            IconButton(
              icon: Icon(_showMap ? Icons.list : Icons.map),
              onPressed: () => setState(() => _showMap = !_showMap),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Error: $_error'))
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_stats != null) ...[
                        Row(
                          children: [
                            _StatCard(
                              label: 'This Month',
                              value: '${_stats!.totalCasesThisMonth}',
                              color: Theme.of(context).colorScheme.primary,
                            ),
                            const SizedBox(width: 12),
                            _StatCard(
                              label: 'Hospitals',
                              value: '${_stats!.registeredHospitals}',
                              color: Theme.of(context).colorScheme.secondary,
                            ),
                            const SizedBox(width: 12),
                            _StatCard(
                              label: 'Change',
                              value: '${_stats!.changePercent >= 0 ? '+' : ''}${_stats!.changePercent}%',
                              color: _stats!.changePercent > 0
                                  ? Theme.of(context).colorScheme.error
                                  : Theme.of(context).colorScheme.primary,
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Text('6-Month Trend', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 16),
                        SizedBox(
                          height: 200,
                          child: BarChart(
                            BarChartData(
                              alignment: BarChartAlignment.spaceAround,
                              maxY: _stats!.trend.fold<double>(0, (max, t) => t.count > max ? t.count.toDouble() : max).clamp(10, double.infinity),
                              barTouchData: BarTouchData(enabled: true),
                              titlesData: FlTitlesData(
                                show: true,
                                bottomTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    getTitlesWidget: (value, meta) {
                                      final i = value.toInt();
                                      if (i < 0 || i >= _stats!.trend.length) return const SizedBox();
                                      return Text(_stats!.trend[i].month, style: const TextStyle(fontSize: 11));
                                    },
                                  ),
                                ),
                                leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 30)),
                                topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              ),
                              gridData: FlGridData(show: true, drawVerticalLine: false),
                              borderData: FlBorderData(show: false),
                              barGroups: List.generate(_stats!.trend.length, (i) {
                                return BarChartGroupData(x: i, barRods: [
                                  BarChartRodData(
                                    toY: _stats!.trend[i].count.toDouble(),
                                    color: Theme.of(context).colorScheme.primary,
                                    width: 20,
                                    borderRadius: const BorderRadius.only(topLeft: Radius.circular(4), topRight: Radius.circular(4)),
                                  ),
                                ]);
                              }),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text('Active Notices', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 8),
                        if (_stats!.activeNotices.isEmpty)
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Text('No active notices', style: Theme.of(context).textTheme.bodyMedium),
                            ),
                          )
                        else
                          ..._stats!.activeNotices.map((n) => Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(n['title'] ?? '', style: Theme.of(context).textTheme.titleMedium),
                                      Text(n['body'] ?? '', style: Theme.of(context).textTheme.bodyMedium),
                                    ],
                                  ),
                                ),
                              )),
                        const SizedBox(height: 24),
                        Text('Nearby Hospitals', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 8),
                      ],
                      if (_showMap && _hospitals.isNotEmpty)
                        SizedBox(
                          height: 300,
                          child: Card(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: FlutterMap(
                                options: MapOptions(
                                  center: LatLng(_hospitals.first.latitude, _hospitals.first.longitude),
                                  zoom: 12,
                                ),
                                children: [
                                  TileLayer(
                                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                    userAgentPackageName: 'com.rabies.user_app',
                                  ),
                                  MarkerLayer(
                                    markers: _hospitals.map((h) => Marker(
                                      point: LatLng(h.latitude, h.longitude),
                                      width: 80,
                                      height: 80,
                                      child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.local_hospital, color: Theme.of(context).colorScheme.primary, size: 28),
                                          Text(h.name, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                                        ],
                                      ),
                                    )).toList(),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ..._hospitals.map((h) => Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: Icon(Icons.local_hospital, color: Theme.of(context).colorScheme.primary),
                              title: Text(h.name, style: Theme.of(context).textTheme.titleMedium),
                              subtitle: Text(h.address, style: Theme.of(context).textTheme.bodyMedium),
                              trailing: TextButton(
                                onPressed: () => _openDirections(h.latitude, h.longitude),
                                child: const Text('Directions'),
                              ),
                            ),
                          )),
                    ],
                  ),
                ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatCard({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: color)),
              Text(label, style: Theme.of(context).textTheme.labelSmall),
            ],
          ),
        ),
      ),
    );
  }
}