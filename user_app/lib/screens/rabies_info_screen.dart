import 'package:flutter/material.dart';
import 'bite_reporting_screen.dart';

class RabiesInfoScreen extends StatelessWidget {
  const RabiesInfoScreen({super.key});

  static const _sections = [
    _Section('What is Rabies?',
        'Rabies is a fatal viral disease transmitted through the bite, scratch, or saliva of an infected animal. It affects the central nervous system and is almost always fatal once symptoms appear.'),
    _Section('How does it spread?',
        'Rabies spreads through bites, scratches, or saliva contact with broken skin or mucous membranes. The main sources are dogs (especially in India), but cats, monkeys, bats, and other mammals can also transmit it.'),
    _Section('Symptoms',
        'Early symptoms: fever, headache, tingling at the bite site.\n\nLate symptoms: confusion, hydrophobia (fear of water), paralysis.\n\nOnce symptoms appear, rabies is almost always fatal — this is why acting immediately after a bite matters.'),
    _Section('Why timing matters',
        'Rabies has an incubation period of weeks to months. Treatment (vaccine + immunoglobulin) works only if started BEFORE symptoms begin. Once symptoms show, the disease is nearly 100% fatal.'),
    _Section('Myths vs Facts',
        'Myth: Only mad/foaming dogs carry rabies.\nFact: A calm-looking animal can also be infected.\n\nMyth: Rabies can be cured if treated early enough.\nFact: Rabies is preventable (via vaccine), not curable.\n\nMyth: Traditional remedies like applying chili powder help.\nFact: These worsen the wound and increase infection risk.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rabies Information')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BiteReportingScreen())),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.error.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning_rounded, color: Theme.of(context).colorScheme.error),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'In an emergency, tap here to report a bite',
                      style: TextStyle(fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.error),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          ..._sections.map((s) => _ExpandableCard(section: s)),
        ],
      ),
    );
  }
}

class _Section {
  final String title;
  final String body;
  const _Section(this.title, this.body);
}

class _ExpandableCard extends StatefulWidget {
  final _Section section;
  const _ExpandableCard({required this.section});

  @override
  State<_ExpandableCard> createState() => _ExpandableCardState();
}

class _ExpandableCardState extends State<_ExpandableCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(
        children: [
          ListTile(
            title: Text(widget.section.title, style: Theme.of(context).textTheme.titleMedium),
            trailing: Icon(_expanded ? Icons.expand_less : Icons.expand_more),
            onTap: () => setState(() => _expanded = !_expanded),
          ),
          if (_expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(widget.section.body, style: Theme.of(context).textTheme.bodyMedium),
            ),
        ],
      ),
    );
  }
}