// Choropleth of Jabalpur district's 10 tehsils, drawn from pre-projected SVG paths
// (assets/geo/jabalpur-tehsils.paths.json, ~23 KB; built by tools/geo/build-tehsils.js).
// Two views: the whole district, and a zoomed city view for the small urban tehsils.
// No map tiles, no network.
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import '../theme/rr_theme.dart';

class TehsilShape {
  final String name;
  final Path path;
  final Offset labelAt;
  final bool showLabel;
  final bool approximate;
  TehsilShape(this.name, this.path, this.labelAt, this.showLabel, this.approximate);
}

class TehsilView {
  final double width, height;
  final Offset city;
  final List<TehsilShape> areas;

  /// Margin (in map units) cropped off each side. The zoomed city view is cut out of
  /// the district, so its outer tehsils end in straight edges at the frame; cropping
  /// the margin puts those edges exactly on the widget border, where they disappear.
  final double inset;
  TehsilView(this.width, this.height, this.city, this.areas, {this.inset = 0});

  double get shownWidth => width - 2 * inset;
  double get shownHeight => height - 2 * inset;

  /// True when [path] runs along the cropped frame (a cut edge, not a real border).
  bool touchesFrame(Path path) {
    if (inset == 0) return false;
    final b = path.getBounds();
    const e = 0.5;
    return b.left <= inset + e || b.top <= inset + e || b.right >= width - inset - e || b.bottom >= height - inset - e;
  }

  factory TehsilView.fromJson(Map<String, dynamic> j) {
    final city = j['city'] as List;
    final w = (j['W'] as num).toDouble(), h = (j['H'] as num).toDouble();
    final pad = ((j['proj'] as Map?)?['pad'] as num?)?.toDouble() ?? 0;
    final areas = [
        for (final a in j['areas'])
          TehsilShape(
            a['name'],
            _parse(a['d']),
            Offset((a['lx'] as num).toDouble(), (a['ly'] as num).toDouble()),
            a['label'] == true,
            a['approx'] == true,
          ),
    ];
    // Clipped view: the shapes together fill the whole padded frame.
    var bounds = areas.first.path.getBounds();
    for (final a in areas.skip(1)) {
      bounds = bounds.expandToInclude(a.path.getBounds());
    }
    const e = 0.5;
    final clipped = pad > 0 && bounds.left <= pad + e && bounds.top <= pad + e && bounds.right >= w - pad - e && bounds.bottom >= h - pad - e;
    return TehsilView(w, h, Offset((city[0] as num).toDouble(), (city[1] as num).toDouble()), areas, inset: clipped ? pad : 0);
  }

  /// Parses "M x y L x y … Z" (the only commands in the file).
  static Path _parse(String d) {
    final path = Path()..fillType = PathFillType.evenOdd; // holes where tehsils were carved out
    for (final m in RegExp(r'([MLZ])([^MLZ]*)').allMatches(d)) {
      final nums = m.group(2)!.trim().split(RegExp(r'[\s,]+')).where((x) => x.isNotEmpty).map(double.parse).toList();
      switch (m.group(1)) {
        case 'M':
          path.moveTo(nums[0], nums[1]);
          for (var i = 2; i + 1 < nums.length; i += 2) {
            path.lineTo(nums[i], nums[i + 1]);
          }
        case 'L':
          for (var i = 0; i + 1 < nums.length; i += 2) {
            path.lineTo(nums[i], nums[i + 1]);
          }
        case 'Z':
          path.close();
      }
    }
    return path;
  }
}

class TehsilGeo {
  final TehsilView district;
  final TehsilView city;
  TehsilGeo(this.district, this.city);

  static Future<TehsilGeo>? _cache;

  /// Loads once; a failed load is not cached, so the next call retries.
  static Future<TehsilGeo> load() {
    final future = _cache ??= _load();
    future.catchError((_) {
      _cache = null;
      return TehsilGeo(TehsilView(1, 1, Offset.zero, []), TehsilView(1, 1, Offset.zero, []));
    });
    return future;
  }

  static Future<TehsilGeo> _load() async {
    final json = jsonDecode(await rootBundle.loadString('assets/geo/jabalpur-tehsils.paths.json'));
    return TehsilGeo(TehsilView.fromJson(json['district']), TehsilView.fromJson(json['city']));
  }
}

/// Case-count colour bands from the design: (minimum, fill, text-on-fill).
List<(int, Color, Color)> tehsilBands(bool dark) => dark
    ? const [
        (0, Color(0xFF4A2814), Color(0xFFFFDCC4)), (8, Color(0xFF633016), Color(0xFFFFDCC4)),
        (12, Color(0xFF8A3F14), Color(0xFFFFFFFF)), (20, Color(0xFFD0703A), Color(0xFF1A0A02)),
        (40, Color(0xFFF5A06B), Color(0xFF1A0A02)),
      ]
    : const [
        (0, Color(0xFFF9D9C4), Color(0xFF5A2305)), (8, Color(0xFFF2BC98), Color(0xFF4A1D04)),
        (12, Color(0xFFEC9A6C), Color(0xFF3D1703)), (20, Color(0xFFB24E1A), Color(0xFFFFFFFF)),
        (40, Color(0xFF7E300A), Color(0xFFFFFFFF)),
      ];

(int, Color, Color) bandFor(int n, bool dark) {
  final bands = tehsilBands(dark);
  var band = bands.first;
  for (final b in bands) {
    if (n >= b.$1) band = b;
  }
  return band;
}

class TehsilMap extends StatelessWidget {
  final TehsilView view;
  final Map<String, int> counts;
  final String? selected;
  final String Function(String) label;
  final String semanticLabel;
  final ValueChanged<String> onSelect;
  const TehsilMap({super.key, required this.view, required this.counts, required this.selected, required this.label,
      required this.semanticLabel, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return AspectRatio(
      aspectRatio: view.shownWidth / view.shownHeight,
      child: LayoutBuilder(builder: (context, box) {
        final scale = box.maxWidth / view.shownWidth;
        return Semantics(
          label: semanticLabel,
          child: GestureDetector(
            onTapUp: (d) {
              final p = d.localPosition / scale + Offset(view.inset, view.inset);
              // Check the smallest shapes first so tiny tehsils stay tappable.
              for (final a in view.areas.reversed) {
                if (a.path.contains(p)) {
                  onSelect(a.name);
                  return;
                }
              }
            },
            child: ClipRect(
              child: Stack(clipBehavior: Clip.none, children: [
                Positioned.fill(child: CustomPaint(painter: _MapPainter(view, counts, selected, scale, dark, c))),
                for (final a in view.areas.where((a) => a.showLabel)) _chip(context, a, scale),
              ]),
            ),
          ),
        );
      }),
    );
  }

  Widget _chip(BuildContext context, TehsilShape a, double scale) {
    final c = context.rr;
    final sel = a.name == selected;
    final pos = (a.labelAt - Offset(view.inset, view.inset)) * scale;
    return Positioned(
      left: pos.dx,
      top: pos.dy,
      child: FractionalTranslation(
        translation: const Offset(-0.5, -0.5),
        child: IgnorePointer(
          child: Semantics(
            button: true,
            selected: sel,
            label: '${label(a.name)}: ${counts[a.name] ?? 0}',
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                color: sel ? c.primaryContainer : c.surface.withValues(alpha: selected != null ? 0.8 : 1),
                borderRadius: BorderRadius.circular(7),
                border: Border.all(color: sel ? c.primaryBorder : Colors.transparent),
              ),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(label(a.name) + (a.approximate ? '*' : ''),
                    style: TextStyle(fontSize: 13, height: 15 / 13, fontWeight: FontWeight.w600, color: sel ? c.onPrimaryContainer : c.textPrimary)),
                Text('${counts[a.name] ?? 0}', style: TextStyle(fontSize: 18, height: 20 / 18, fontWeight: FontWeight.w600,
                    fontFeatures: const [FontFeature.tabularFigures()], color: sel ? c.onPrimaryContainer : c.textPrimary)),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

class _MapPainter extends CustomPainter {
  final TehsilView view;
  final Map<String, int> counts;
  final String? selected;
  final double scale;
  final bool dark;
  final RRColors c;
  _MapPainter(this.view, this.counts, this.selected, this.scale, this.dark, this.c);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(scale);
    canvas.translate(-view.inset, -view.inset);
    final border = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5 / scale // constant on-screen width in both views
      ..strokeJoin = StrokeJoin.round
      ..color = c.surface;
    for (final a in view.areas) {
      final fill = bandFor(counts[a.name] ?? 0, dark).$2;
      // With a tehsil selected, the others fade back so it stands out without heavy lines.
      final faded = selected != null && a.name != selected;
      canvas.drawPath(a.path, Paint()..color = faded ? Color.lerp(fill, c.surfaceAlt, 0.6)! : fill);
      canvas.drawPath(a.path, border);
    }
    for (final a in view.areas.where((a) => a.name == selected && !view.touchesFrame(a.path))) {
      canvas.drawPath(a.path, Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5 / scale
        ..strokeJoin = StrokeJoin.round
        ..color = c.primary);
    }
    // City marker
    final r = 5 / scale;
    canvas.drawCircle(view.city, r, Paint()..color = c.surface);
    canvas.drawCircle(view.city, r, Paint()..style = PaintingStyle.stroke..strokeWidth = 2 / scale..color = c.textPrimary);
    canvas.drawCircle(view.city, 1.8 / scale, Paint()..color = c.textPrimary);
  }

  @override
  bool shouldRepaint(_MapPainter old) =>
      old.selected != selected || old.scale != scale || old.dark != dark || old.counts != counts || old.view != view;
}
