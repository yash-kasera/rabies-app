import 'package:flutter/material.dart';
import '../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService.get('/user/notifications', auth: true);
      setState(() {
        _notifications = data['data'] ?? [];
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none, size: 64, color: Theme.of(context).colorScheme.primary.withOpacity(0.5)),
                      const SizedBox(height: 16),
                      Text('No notifications', style: Theme.of(context).textTheme.titleLarge),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _notifications.length,
                    itemBuilder: (context, i) {
                      final n = _notifications[i];
                      final category = n['category'] ?? '';
                      IconData icon;
                      switch (category) {
                        case 'OutbreakAlert':
                          icon = Icons.warning_rounded;
                          break;
                        case 'NewHospital':
                          icon = Icons.local_hospital;
                          break;
                        case 'MaintenanceNotice':
                          icon = Icons.build_outlined;
                          break;
                        default:
                          icon = Icons.campaign_outlined;
                      }
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
                          title: Text(n['title'] ?? '', style: Theme.of(context).textTheme.titleMedium),
                          subtitle: Text(n['body'] ?? '', style: Theme.of(context).textTheme.bodyMedium),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}