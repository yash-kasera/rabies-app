import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import 'rabies_info_screen.dart';
import 'precautions_screen.dart';
import 'bite_reporting_screen.dart';
import 'city_cases_screen.dart';
import 'my_reports_screen.dart';
import 'notifications_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final _screens = const [
    _HomeTab(),
    RabiesInfoScreen(),
    PrecautionsScreen(),
    NotificationsScreen(),
    MyReportsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.info_outlined), activeIcon: Icon(Icons.info), label: 'Info'),
          BottomNavigationBarItem(icon: Icon(Icons.health_and_safety_outlined), activeIcon: Icon(Icons.health_and_safety), label: 'Precautions'),
          BottomNavigationBarItem(icon: Icon(Icons.notifications_outlined), activeIcon: Icon(Icons.notifications), label: 'Alerts'),
          BottomNavigationBarItem(icon: Icon(Icons.assignment_outlined), activeIcon: Icon(Icons.assignment), label: 'Reports'),
        ],
      ),
    );
  }
}

class _HomeTab extends StatelessWidget {
  const _HomeTab();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Rabies Response', style: theme.textTheme.headlineMedium),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.location_city_outlined),
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CityCasesScreen())),
                    ),
                    IconButton(
                      icon: Icon(context.watch<ThemeProvider>().themeMode == ThemeMode.dark
                          ? Icons.light_mode
                          : Icons.dark_mode),
                      onPressed: () => context.read<ThemeProvider>().toggleTheme(),
                    ),
                    IconButton(
                      icon: const Icon(Icons.logout),
                      onPressed: () => context.read<AuthProvider>().logout(),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 80,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BiteReportingScreen())),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.emergencyLight,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.warning_rounded, size: 32),
                label: const Text('Report a Bite', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: _SecondaryCard(
                    icon: Icons.health_and_safety,
                    title: 'Precautions',
                    subtitle: 'First aid steps',
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrecautionsScreen())),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _SecondaryCard(
                    icon: Icons.info_outline,
                    title: 'Rabies Info',
                    subtitle: 'Learn about rabies',
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RabiesInfoScreen())),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _CitySummaryCard(),
          ],
        ),
      ),
    );
  }
}

class _SecondaryCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _SecondaryCard({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: Theme.of(context).colorScheme.primary, size: 28),
              const SizedBox(height: 8),
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              Text(subtitle, style: Theme.of(context).textTheme.labelSmall),
            ],
          ),
        ),
      ),
    );
  }
}

class _CitySummaryCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.surface.withOpacity(0.5),
      child: InkWell(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CityCasesScreen())),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(Icons.analytics_outlined, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Cases in your city', style: Theme.of(context).textTheme.titleMedium),
                    Text('Tap to view stats & nearby hospitals', style: Theme.of(context).textTheme.labelSmall),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.primary),
            ],
          ),
        ),
      ),
    );
  }
}