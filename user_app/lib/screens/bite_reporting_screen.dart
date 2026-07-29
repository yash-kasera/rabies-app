import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import 'package:image_picker/image_picker.dart';

class BiteReportingScreen extends StatefulWidget {
  const BiteReportingScreen({super.key});

  @override
  State<BiteReportingScreen> createState() => _BiteReportingScreenState();
}

class _BiteReportingScreenState extends State<BiteReportingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  double? _latitude;
  double? _longitude;

  String _animalType = 'Dog';
  String _animalStatus = 'Unknown';
  String _severity = 'MinorScratch';
  bool _submitting = false;
  bool _submitted = false;
  int _notifiedHospitals = 0;
  List<dynamic> _hospitals = [];
  String? _photoBase64;

  final _animalTypes = ['Dog', 'Cat', 'Monkey', 'Bat', 'Other'];
  final _animalStatuses = ['LookedHealthy', 'LookedSickOrAggressive', 'Stray', 'OwnedAndVaccinated', 'Unknown'];
  final _severities = ['MinorScratch', 'BleedingWound', 'DeepWound', 'MultipleBites'];
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    if (user != null) {
      _nameController.text = user.fullName;
      _phoneController.text = user.phoneNumber;
    }
    _detectLocation();
  }

  Future<void> _detectLocation() async {
    try {
      final uri = Uri.parse('http://ip-api.com/json/?fields=lat,lon');
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _latitude = data['lat'];
          _longitude = data['lon'];
        });
      }
    } catch (_) {}
  }

  Future<void> _pickPhoto() async {
    try {
      final file = await _picker.pickImage(source: ImageSource.camera, maxWidth: 1024);
      if (file != null) {
        final bytes = await file.readAsBytes();
        setState(() => _photoBase64 = base64Encode(bytes));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Camera error: $e')));
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    try {
      final body = {
        'victimName': _nameController.text.trim(),
        'contactNumber': _phoneController.text.trim(),
        'latitude': _latitude ?? 22.7196,
        'longitude': _longitude ?? 75.8577,
        'animalType': _animalType,
        'animalStatus': _animalStatus,
        'severity': _severity,
        'cityId': context.read<AuthProvider>().user!.cityId,
      };

      final response = await ApiService.post('/user/reports', body, auth: true);

      setState(() {
        _submitting = false;
        _submitted = true;
        _notifiedHospitals = response['notifiedHospitals'] ?? 0;
        _hospitals = response['hospitals'] ?? [];
      });
    } on ApiException catch (e) {
      setState(() => _submitting = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      setState(() => _submitting = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to submit report')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) {
      return Scaffold(
        appBar: AppBar(title: const Text('Report Submitted')),
        body: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Icon(Icons.check_circle_outline, size: 80, color: AppColors.successLight),
            const SizedBox(height: 24),
            Text('Your report has been sent!', style: Theme.of(context).textTheme.headlineMedium, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text('Sent to $_notifiedHospitals hospitals near you. Please proceed to the nearest one immediately.',
                style: Theme.of(context).textTheme.bodyLarge, textAlign: TextAlign.center),
            if (_hospitals.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text('Nearby Hospitals', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              ..._hospitals.map((h) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Icon(Icons.local_hospital, color: Theme.of(context).colorScheme.primary),
                      title: Text(h['name'] ?? '', style: Theme.of(context).textTheme.titleMedium),
                      subtitle: Text(h['address'] ?? '', style: Theme.of(context).textTheme.bodyMedium),
                      trailing: TextButton(
                        onPressed: () {},
                        child: const Text('Directions'),
                      ),
                    ),
                  )),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Back to Home'),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Report a Bite')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Report Details', style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 24),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Victim Name', prefixIcon: Icon(Icons.person_outlined)),
                validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: 'Contact Number', prefixIcon: Icon(Icons.phone_outlined)),
                keyboardType: TextInputType.phone,
                validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Icon(Icons.my_location, color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _latitude != null
                              ? 'Location detected: ${_latitude!.toStringAsFixed(4)}, ${_longitude!.toStringAsFixed(4)}'
                              : 'Detecting location...',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _animalType,
                decoration: const InputDecoration(labelText: 'Animal Type'),
                items: _animalTypes.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                onChanged: (v) => setState(() => _animalType = v!),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _animalStatus,
                decoration: const InputDecoration(labelText: 'Animal Status'),
                items: _animalStatuses.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                onChanged: (v) => setState(() => _animalStatus = v!),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _severity,
                decoration: const InputDecoration(labelText: 'Bite Severity'),
                items: _severities.map((e) => DropdownMenuItem(value: e, child: Text(_severityLabel(e)))).toList(),
                onChanged: (v) => setState(() => _severity = v!),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _pickPhoto,
                icon: const Icon(Icons.camera_alt_outlined),
                label: Text(_photoBase64 != null ? 'Photo taken' : 'Add photo of wound (optional)'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                height: 56,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.emergencyLight),
                  child: _submitting
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Submit Report', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
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
}