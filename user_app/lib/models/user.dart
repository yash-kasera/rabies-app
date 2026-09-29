class User {
  final int id;
  final String fullName;
  final String phoneNumber;
  final String? email;
  final int cityId;
  final String? cityName;
  final String role;
  final bool phoneVerified;

  User({
    required this.id,
    required this.fullName,
    required this.phoneNumber,
    this.email,
    required this.cityId,
    this.cityName,
    required this.role,
    this.phoneVerified = false,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'],
    fullName: json['fullName'] ?? json['full_name'],
    phoneNumber: json['phoneNumber'] ?? json['phone_number'],
    email: json['email'],
    cityId: json['cityId'] ?? json['city_id'],
    cityName: json['city'] is Map ? json['city']['name'] : null,
    role: json['role'],
    phoneVerified: json['phoneVerified'] ?? json['phone_verified'] ?? false,
  );
}
