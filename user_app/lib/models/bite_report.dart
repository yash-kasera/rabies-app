class VaccineDose {
  final int doseNumber;
  final DateTime scheduledDate;
  final DateTime? givenDate;

  VaccineDose({required this.doseNumber, required this.scheduledDate, this.givenDate});

  factory VaccineDose.fromJson(Map<String, dynamic> json) => VaccineDose(
        doseNumber: json['doseNumber'],
        scheduledDate: DateTime.parse(json['scheduledDate']),
        givenDate: json['givenDate'] == null ? null : DateTime.parse(json['givenDate']),
      );
}

class BiteReport {
  final int id;
  final String victimName;
  final String contactNumber;
  final String animalType;
  final String animalStatus;
  final String severity;
  final String status;
  final String? hospitalName;
  final DateTime createdAt;
  final List<VaccineDose> doses;
  final String? description;
  final bool hasPhoto;
  /// Length of the voice note in seconds; null when none was recorded.
  final int? voiceSeconds;

  BiteReport({
    required this.id,
    required this.victimName,
    required this.contactNumber,
    required this.animalType,
    required this.animalStatus,
    required this.severity,
    required this.status,
    this.hospitalName,
    required this.createdAt,
    this.doses = const [],
    this.description,
    this.hasPhoto = false,
    this.voiceSeconds,
  });

  factory BiteReport.fromJson(Map<String, dynamic> json) => BiteReport(
        id: json['id'],
        victimName: json['victimName'],
        contactNumber: json['contactNumber'],
        animalType: json['animalType'],
        animalStatus: json['animalStatus'] ?? 'Unknown',
        severity: json['severity'],
        status: json['status'],
        hospitalName: json['hospital']?['name'],
        createdAt: DateTime.parse(json['createdAt']),
        description: json['description'],
        hasPhoto: json['photoUrl'] != null,
        voiceSeconds: json['voiceSeconds'] as int?,
        doses: ((json['case_']?['doses'] as List?) ?? [])
            .map((d) => VaccineDose.fromJson(d as Map<String, dynamic>))
            .toList()
          ..sort((a, b) => a.doseNumber.compareTo(b.doseNumber)),
      );
}
