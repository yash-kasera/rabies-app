class HospitalModel {
  final int id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final String contactNumber;

  HospitalModel({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.contactNumber,
  });

  factory HospitalModel.fromJson(Map<String, dynamic> json) => HospitalModel(
    id: json['id'],
    name: json['name'],
    address: json['address'],
    latitude: (json['latitude'] as num).toDouble(),
    longitude: (json['longitude'] as num).toDouble(),
    contactNumber: json['contactNumber'] ?? json['contact_number'],
  );
}