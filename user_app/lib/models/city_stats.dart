class CityStats {
  final int totalCasesThisMonth;
  final int totalCases;
  final int changePercent;
  final List<TrendPoint> trend;
  final int registeredHospitals;
  final List<dynamic> activeNotices;
  final List<AreaCount> areas;

  CityStats({
    required this.totalCasesThisMonth,
    required this.totalCases,
    required this.changePercent,
    required this.trend,
    required this.registeredHospitals,
    required this.activeNotices,
    required this.areas,
  });

  factory CityStats.fromJson(Map<String, dynamic> json) => CityStats(
        totalCasesThisMonth: json['totalCasesThisMonth'],
        totalCases: json['totalCases'],
        changePercent: json['changePercent'],
        trend: (json['trend'] as List).map((e) => TrendPoint.fromJson(e)).toList(),
        registeredHospitals: json['registeredHospitals'],
        activeNotices: json['activeNotices'] ?? [],
        areas: ((json['areas'] as List?) ?? []).map((e) => AreaCount.fromJson(e)).toList(),
      );
}

class TrendPoint {
  final String month; // "Sep" — English short month from the server
  final int count;

  TrendPoint({required this.month, required this.count});

  factory TrendPoint.fromJson(Map<String, dynamic> json) => TrendPoint(month: json['month'], count: json['count']);
}

/// Cases in one tehsil this month, and last month for comparison.
class AreaCount {
  final String name;
  final int count;
  final int lastMonth;

  AreaCount({required this.name, required this.count, required this.lastMonth});

  int get delta => count - lastMonth;

  factory AreaCount.fromJson(Map<String, dynamic> json) =>
      AreaCount(name: json['name'], count: json['count'], lastMonth: json['lastMonth']);
}
