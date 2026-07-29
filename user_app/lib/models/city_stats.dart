class CityStats {
  final int totalCasesThisMonth;
  final int totalCases;
  final int changePercent;
  final List<TrendPoint> trend;
  final int registeredHospitals;
  final List<dynamic> activeNotices;

  CityStats({
    required this.totalCasesThisMonth,
    required this.totalCases,
    required this.changePercent,
    required this.trend,
    required this.registeredHospitals,
    required this.activeNotices,
  });

  factory CityStats.fromJson(Map<String, dynamic> json) => CityStats(
    totalCasesThisMonth: json['totalCasesThisMonth'],
    totalCases: json['totalCases'],
    changePercent: json['changePercent'],
    trend: (json['trend'] as List).map((e) => TrendPoint.fromJson(e)).toList(),
    registeredHospitals: json['registeredHospitals'],
    activeNotices: json['activeNotices'] ?? [],
  );
}

class TrendPoint {
  final String month;
  final int count;

  TrendPoint({required this.month, required this.count});

  factory TrendPoint.fromJson(Map<String, dynamic> json) => TrendPoint(
    month: json['month'],
    count: json['count'],
  );
}