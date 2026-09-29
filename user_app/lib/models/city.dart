class City {
  final int id;
  final String name;
  final String state;

  City({required this.id, required this.name, required this.state});

  factory City.fromJson(Map<String, dynamic> json) => City(
    id: json['id'],
    name: json['name'],
    state: json['state'] ?? '',
  );
}
