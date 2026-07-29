import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'bite_reporting_screen.dart';

class PrecautionsScreen extends StatelessWidget {
  const PrecautionsScreen({super.key});

  static const _steps = [
    _Step(Icons.water_drop, 'Wash the wound immediately with soap and running water for at least 15 minutes.'),
    _Step(Icons.medication_outlined, 'Apply an antiseptic (e.g. povidone-iodine) if available.'),
    _Step(Icons.block, 'Do NOT cover the wound tightly or apply any traditional/home remedies (oil, herbs, chili powder, etc.).'),
    _Step(Icons.block, 'Do NOT try to suck out any "venom" — rabies is a virus, not a venom. This is a myth.'),
    _Step(Icons.local_hospital, 'Go to the nearest hospital/clinic as soon as possible for a post-exposure vaccine.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('What To Do Now')),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('Immediate First Aid', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 24),
                ...List.generate(_steps.length, (i) {
                  final step = _steps[i];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Center(
                              child: Text('${i + 1}',
                                  style: TextStyle(fontWeight: FontWeight.w700, color: Theme.of(context).colorScheme.primary)),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(step.icon, color: Theme.of(context).colorScheme.primary, size: 24),
                                const SizedBox(height: 4),
                                Text(step.text, style: Theme.of(context).textTheme.bodyLarge),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Do's", style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        _bullets(context, [
                          'Note the animal\'s appearance/behavior if safely possible.',
                          'Keep the wound clean and loosely covered.',
                          'Complete the full vaccine dose schedule even if you feel fine.',
                        ]),
                        const SizedBox(height: 16),
                        Text("Don'ts", style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        _bullets(context, [
                          "Don't ignore a minor-looking scratch — even small wounds can transmit rabies.",
                          "Don't wait to see if the animal seems sick before seeking care.",
                          "Don't stop the vaccine course early.",
                        ]),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: ElevatedButton.icon(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BiteReportingScreen())),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.emergencyLight,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 56),
                ),
                icon: const Icon(Icons.warning_rounded),
                label: const Text('Report This Bite Now', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _bullets(BuildContext context, List<String> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: items
          .map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('•  '),
                    Expanded(child: Text(e, style: Theme.of(context).textTheme.bodyMedium)),
                  ],
                ),
              ))
          .toList(),
    );
  }
}

class _Step {
  final IconData icon;
  final String text;
  const _Step(this.icon, this.text);
}