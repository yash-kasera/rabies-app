class BiteReport {
  final int id;
  final String victimName;
  final String contactNumber;
  final double latitude;
  final double longitude;
  final int cityId;
  final String incidentDatetime;
  final String animalType;
  final String animalStatus;
  final String severity;
  final String? photoUrl;
  final String status;
  final String? hospitalName;
  final String createdAt;

  BiteReport({
    required this.id,
    required this.victimName,
    required this.contactNumber,
    required this.latitude,
    required this.longitude,
    required this.cityId,
    required this.incidentDatetime,
    required this.animalType,
    required this.animalStatus,
    required this.severity,
    this.photoUrl,
    required this.status,
    this.hospitalName,
    required this.createdAt,
  });

  factory BiteReport.fromJson(Map<String, dynamic> json) => BiteReport(
    id: json['id'],
    victimName: json['victimName'] ?? json['victim_name'],
    contactNumber: json['contactNumber'] ?? json['contact_number'],
    latitude: (json['latitude'] as num).toDouble(),
    longitude: (json['longitude'] as num).toDouble(),
    cityId: json['cityId'] ?? json['city_id'],
    incidentDatetime: json['incidentDatetime'] ?? json['incident_datetime'],
    animalType: json['animalType'] ?? json['animal_type'],
    animalStatus: json['animalStatus'] ?? json['animal_status'],
    severity: json['severity'],
    photoUrl: json['photoUrl'] ?? json['photo_url'],
    status: json['status'],
    hospitalName: json['hospital']?['name'],
    createdAt: json['createdAt'] ?? json['created_at'],
  );
}