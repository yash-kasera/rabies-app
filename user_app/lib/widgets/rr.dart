// Rabies Response components (Flutter port of components/components.css).
// Flat surfaces, 1 px borders, colour-only state changes, no ripples or animations.
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../l10n/strings.dart';
import '../providers/locale_provider.dart';
import '../services/api_service.dart';
import '../theme/rr_theme.dart';

// ---------------------------------------------------------------- badges

class RRBadge extends StatelessWidget {
  final RRTone tone;
  final IconData icon;
  final String text;
  final int? level; // severity pips 1–4
  final bool large;
  const RRBadge({super.key, required this.tone, required this.icon, required this.text, this.level, this.large = false});

  /// Badge for an API enum value from one of the [RRStatus] maps.
  factory RRBadge.of(Map<String, RRStatus> map, String key, S s, {bool large = false, bool pips = false}) {
    final st = map[key] ?? const RRStatus(RRTone.neutral, LucideIcons.info);
    return RRBadge(tone: st.tone, icon: st.icon, text: s.status(key), level: pips ? st.level : null, large: large);
  }

  @override
  Widget build(BuildContext context) {
    final (bg, fg, border) = tone.colors(context.rr);
    final style = large ? Theme.of(context).textTheme.labelLarge : Theme.of(context).textTheme.labelMedium;
    return Container(
      padding: large ? const EdgeInsets.fromLTRB(10, 6, 14, 6) : const EdgeInsets.fromLTRB(8, 3, 10, 3),
      decoration: BoxDecoration(color: bg, border: Border.all(color: border), borderRadius: BorderRadius.circular(RRRadius.pill)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: large ? 18 : 16, color: fg),
        const SizedBox(width: 6),
        Flexible(child: Text(text, style: style?.copyWith(color: fg))),
        if (level != null) ...[
          const SizedBox(width: 6),
          Semantics(
            label: 'Level $level of 4',
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              for (var i = 1; i <= 4; i++)
                Container(
                  width: 6, height: 10, margin: EdgeInsets.only(left: i == 1 ? 0 : 2),
                  decoration: BoxDecoration(
                    color: i <= level! ? fg : Colors.transparent,
                    border: Border.all(color: fg), borderRadius: BorderRadius.circular(1),
                  ),
                ),
            ]),
          ),
        ],
      ]),
    );
  }
}

// ---------------------------------------------------------------- notice box (status / alert panels)

class RRNotice extends StatelessWidget {
  final RRTone tone;
  final IconData icon;
  final String title;
  final String? body;
  final Widget? action;
  final Widget? trailing;
  final bool solid; // brand fill (e.g. "sent to N hospitals")
  const RRNotice({super.key, required this.tone, required this.icon, required this.title, this.body, this.action, this.trailing, this.solid = false});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    final (bg0, fg0, border0) = tone.colors(c);
    final bg = solid ? c.primary : bg0, fg = solid ? c.onPrimary : fg0, border = solid ? c.primary : border0;
    final t = Theme.of(context).textTheme;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: bg, border: Border.all(color: border), borderRadius: BorderRadius.circular(RRRadius.lg)),
        child: Wrap(
          spacing: 12, runSpacing: 10, crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Padding(padding: const EdgeInsets.only(top: 1), child: Icon(icon, size: 24, color: fg)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: (body == null && solid ? t.titleMedium : t.labelLarge)?.copyWith(color: fg)),
                  if (body != null) Text(body!, style: t.bodySmall?.copyWith(color: fg)),
                ]),
              ),
              if (trailing != null) ...[const SizedBox(width: 8), IconTheme(data: IconThemeData(color: fg), child: trailing!)],
            ]),
            if (action != null) Padding(padding: const EdgeInsets.only(left: 36), child: action),
          ],
        ),
      ),
    );
  }
}

/// Small pill button used inside notices (Retry).
class RRPillAction extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback onPressed;
  final RRTone tone;
  const RRPillAction({super.key, required this.label, required this.onPressed, this.icon, this.tone = RRTone.warning});

  @override
  Widget build(BuildContext context) {
    final (_, fg, border) = tone.colors(context.rr);
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: icon == null ? null : Icon(icon, size: 16),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 44), padding: const EdgeInsets.symmetric(horizontal: 14),
        foregroundColor: fg, backgroundColor: context.rr.surface, side: BorderSide(color: border),
      ),
    );
  }
}

// ---------------------------------------------------------------- buttons

enum RRButtonKind { primary, secondary, emergency, text }

class RRButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final RRButtonKind kind;
  final bool large;
  final bool block;
  final bool loading; // keeps its colour while busy (unlike disabled)
  const RRButton(this.label, {super.key, this.icon, this.onPressed, this.kind = RRButtonKind.primary, this.large = false, this.block = false, this.loading = false});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final (bg, bgPressed, fg, side) = switch (kind) {
      RRButtonKind.primary => (c.primary, c.primaryPressed, c.onPrimary, BorderSide.none),
      RRButtonKind.emergency => (c.emergency, c.emergencyPressed, c.onEmergency, BorderSide.none),
      RRButtonKind.secondary => (c.surface, c.primaryContainer, c.primary, BorderSide(color: c.borderStrong)),
      RRButtonKind.text => (Colors.transparent, c.primaryContainer, c.primary, BorderSide.none),
    };
    final enabled = onPressed != null && !loading;
    final style = ButtonStyle(
      minimumSize: WidgetStatePropertyAll(Size(48, large ? 56 : 48)),
      padding: WidgetStatePropertyAll(large ? const EdgeInsets.symmetric(horizontal: 24, vertical: 14)
          : EdgeInsets.symmetric(horizontal: kind == RRButtonKind.text ? 12 : 20, vertical: 10)),
      shape: const WidgetStatePropertyAll(StadiumBorder()),
      elevation: const WidgetStatePropertyAll(0),
      overlayColor: const WidgetStatePropertyAll(Colors.transparent),
      side: WidgetStatePropertyAll(loading || onPressed != null ? side : BorderSide.none),
      backgroundColor: WidgetStateProperty.resolveWith((st) {
        if (loading) return bg;
        if (st.contains(WidgetState.disabled)) return kind == RRButtonKind.text ? Colors.transparent : c.disabledBg;
        if (st.contains(WidgetState.pressed)) return bgPressed;
        return bg;
      }),
      foregroundColor: WidgetStateProperty.resolveWith((st) =>
          !loading && st.contains(WidgetState.disabled) ? c.disabledText : fg),
      textStyle: WidgetStatePropertyAll((large ? t.bodyLarge?.copyWith(fontWeight: FontWeight.w600) : t.labelLarge)
          ?.copyWith(decoration: kind == RRButtonKind.text ? TextDecoration.underline : null)),
    );
    final child = Row(
      mainAxisSize: block ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading || icon != null) ...[Icon(loading ? LucideIcons.loader : icon, size: large ? 24 : 20), const SizedBox(width: 8)],
        Flexible(child: Text(label, textAlign: TextAlign.center)),
      ],
    );
    final button = TextButton(onPressed: enabled ? onPressed : null, style: style, child: child);
    return Semantics(button: true, enabled: enabled, child: block ? SizedBox(width: double.infinity, child: button) : button);
  }
}

// ---------------------------------------------------------------- cards

class RRCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final Color? borderColor;
  final double borderWidth;
  final double radius;
  const RRCard({super.key, required this.child, this.onTap, this.padding = const EdgeInsets.all(16), this.color, this.borderColor,
      this.borderWidth = 1, this.radius = RRRadius.lg});

  @override
  State<RRCard> createState() => _RRCardState();
}

class _RRCardState extends State<RRCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    final box = AnimatedContainer(
      duration: RRMotion.fast,
      padding: widget.padding,
      decoration: BoxDecoration(
        color: _pressed ? c.surfaceAlt : (widget.color ?? c.surface),
        border: Border.all(color: widget.borderColor ?? (_pressed ? c.borderStrong : c.border), width: widget.borderWidth),
        borderRadius: BorderRadius.circular(widget.radius),
      ),
      child: widget.child,
    );
    if (widget.onTap == null) return box;
    return Semantics(
      button: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => setState(() => _pressed = true),
        onTapCancel: () => setState(() => _pressed = false),
        onTapUp: (_) => setState(() => _pressed = false),
        onTap: widget.onTap,
        child: box,
      ),
    );
  }
}

// ---------------------------------------------------------------- chips & options

class RRChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const RRChip({super.key, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    return Semantics(
      button: true, selected: selected,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 48),
          padding: selected ? const EdgeInsets.fromLTRB(11, 9, 15, 9) : const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: selected ? c.primaryContainer : c.surface,
            border: Border.all(color: selected ? c.primary : c.borderStrong, width: selected ? 2 : 1),
            borderRadius: BorderRadius.circular(RRRadius.pill),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            if (selected) ...[Icon(LucideIcons.check, size: 18, color: c.onPrimaryContainer), const SizedBox(width: 6)],
            Flexible(child: Text(label, style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: selected ? c.onPrimaryContainer : c.textPrimary))),
          ]),
        ),
      ),
    );
  }
}

/// Radio-style option row (.rr-option).
class RROption extends StatelessWidget {
  final bool selected;
  final VoidCallback onTap;
  final Widget child;
  const RROption({super.key, required this.selected, required this.onTap, required this.child});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    return Semantics(
      inMutuallyExclusiveGroup: true, checked: selected,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: double.infinity,
          constraints: const BoxConstraints(minHeight: 56),
          padding: EdgeInsets.all(selected ? 11 : 12),
          decoration: BoxDecoration(
            color: selected ? c.primaryContainer : c.surface,
            border: Border.all(color: selected ? c.primary : c.borderStrong, width: selected ? 2 : 1),
            borderRadius: BorderRadius.circular(RRRadius.md),
          ),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 22, height: 22, margin: const EdgeInsets.only(top: 1),
              decoration: BoxDecoration(shape: BoxShape.circle, color: c.surface,
                  border: Border.all(color: selected ? c.primary : c.borderStrong, width: 2)),
              child: selected
                  ? Center(child: Container(width: 10, height: 10, decoration: BoxDecoration(shape: BoxShape.circle, color: c.primary)))
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(child: child),
          ]),
        ),
      ),
    );
  }
}

class RRSegmented<T> extends StatelessWidget {
  final List<(T, String, IconData?)> options;
  final T value;
  final ValueChanged<T> onChanged;
  final double height;
  const RRSegmented({super.key, required this.options, required this.value, required this.onChanged, this.height = 42});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(color: c.surfaceAlt, border: Border.all(color: c.border), borderRadius: BorderRadius.circular(RRRadius.pill)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        for (final (v, label, icon) in options)
          Semantics(
            button: true, selected: v == value,
            child: GestureDetector(
              onTap: () => onChanged(v),
              child: Container(
                height: height,
                margin: const EdgeInsets.symmetric(horizontal: 1),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: v == value ? c.surface : Colors.transparent,
                  border: v == value ? Border.all(color: c.borderStrong) : null,
                  borderRadius: BorderRadius.circular(RRRadius.pill),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  if (icon != null) ...[Icon(icon, size: 18, color: v == value ? c.primary : c.textSecondary), const SizedBox(width: 6)],
                  Text(label, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: v == value ? c.primary : c.textSecondary)),
                ]),
              ),
            ),
          ),
      ]),
    );
  }
}

// ---------------------------------------------------------------- form field wrapper (label above control)

class RRField extends StatelessWidget {
  final String label;
  final String? optionalText;
  final String? hint;
  final Widget child;
  const RRField({super.key, required this.label, required this.child, this.optionalText, this.hint});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final c = context.rr;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text.rich(TextSpan(text: label, style: t.labelLarge, children: [
        if (optionalText != null) TextSpan(text: ' $optionalText', style: t.bodyMedium?.copyWith(color: c.textSecondary)),
      ])),
      const SizedBox(height: 6),
      child,
      if (hint != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(hint!, style: t.bodySmall?.copyWith(color: c.textSecondary))),
    ]);
  }
}

/// Input decoration with an error icon, matching .rr-errortext.
InputDecoration rrInput(BuildContext context, {IconData? prefix, Widget? suffix}) => InputDecoration(
      prefixIcon: prefix == null ? null : Icon(prefix, size: 20, color: context.rr.textSecondary),
      suffixIcon: suffix,
      errorStyle: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.rr.danger, fontWeight: FontWeight.w600),
    );

/// Show / Hide text button inside a password field.
class RRPasswordToggle extends StatelessWidget {
  final bool obscured;
  final VoidCallback onTap;
  const RRPasswordToggle({super.key, required this.obscured, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: TextButton.icon(
        onPressed: onTap,
        icon: Icon(obscured ? LucideIcons.eye : LucideIcons.eyeOff, size: 20),
        label: Text(obscured ? s.show : s.hide),
        style: TextButton.styleFrom(
          textStyle: Theme.of(context).textTheme.labelMedium,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(RRRadius.sm)),
          padding: const EdgeInsets.symmetric(horizontal: 12),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- states

class RRStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? body;
  final Widget? action;
  final bool error;
  final double topPadding;
  const RRStateView({super.key, required this.icon, required this.title, this.body, this.action, this.error = false, this.topPadding = 32});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    return Semantics(
      liveRegion: error,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, topPadding, 16, 32),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(shape: BoxShape.circle, color: error ? c.dangerContainer : c.surfaceAlt),
                child: Icon(icon, size: 28, color: error ? c.onDangerContainer : c.textSecondary),
              ),
              const SizedBox(height: 12),
              Text(title, style: t.titleMedium, textAlign: TextAlign.center),
              if (body != null) ...[const SizedBox(height: 12), Text(body!, style: t.bodyMedium?.copyWith(color: c.textSecondary), textAlign: TextAlign.center)],
              if (action != null) ...[const SizedBox(height: 16), action!],
            ]),
          ),
        ),
      ),
    );
  }
}

/// Static skeleton block — no shimmer (low-end devices).
class RRSkeleton extends StatelessWidget {
  final double? width;
  final double height;
  final double radius;
  const RRSkeleton({super.key, this.width, this.height = 12, this.radius = RRRadius.xs});

  @override
  Widget build(BuildContext context) => Container(
        width: width, height: height,
        decoration: BoxDecoration(color: context.rr.skeleton, borderRadius: BorderRadius.circular(radius)),
      );
}

/// Loading placeholder: [count] cards of skeleton lines.
class RRSkeletonList extends StatelessWidget {
  final int count;
  const RRSkeletonList({super.key, this.count = 3});

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Loading',
        child: ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: count,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (_, i) => RRCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              RRSkeleton(width: 120.0 - i * 10, height: 24, radius: RRRadius.pill),
              const SizedBox(height: 10),
              const FractionallySizedBox(widthFactor: 0.8, child: RRSkeleton()),
              const SizedBox(height: 10),
              const RRSkeleton(),
              const SizedBox(height: 10),
              FractionallySizedBox(widthFactor: 0.6 - i * 0.05, child: const RRSkeleton()),
            ]),
          ),
        ),
      );
}

// ---------------------------------------------------------------- chrome

class RROfflineBanner extends StatelessWidget {
  final VoidCallback onRetry;
  const RROfflineBanner({super.key, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: ApiService.offline,
      builder: (context, isOffline, _) {
        if (!isOffline) return const SizedBox.shrink();
        final c = context.rr;
        final s = context.s;
        final t = Theme.of(context).textTheme;
        return Semantics(
          liveRegion: true,
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 12, 8),
            decoration: BoxDecoration(color: c.warningContainer, border: Border(bottom: BorderSide(color: c.warningBorder))),
            child: Row(children: [
              Icon(LucideIcons.wifiOff, size: 18, color: c.onWarningContainer),
              const SizedBox(width: 8),
              Expanded(
                child: Text.rich(TextSpan(style: t.bodySmall?.copyWith(color: c.onWarningContainer), children: [
                  TextSpan(text: s.offline, style: const TextStyle(fontWeight: FontWeight.w600)),
                  TextSpan(text: ' ${s.offlineMsg}'),
                ])),
              ),
              RRPillAction(label: s.retry, onPressed: onRetry),
            ]),
          ),
        );
      },
    );
  }
}

/// Screen header: optional back arrow, title (+ subtitle), trailing actions.
class RRTopBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String? subtitle;
  final bool back;
  final Widget? leading;
  final List<Widget> actions;
  const RRTopBar({super.key, required this.title, this.subtitle, this.back = false, this.leading, this.actions = const []});

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    return Material(
      color: c.surface,
      child: SafeArea(
        bottom: false,
        child: Container(
          constraints: const BoxConstraints(minHeight: 56),
          padding: EdgeInsets.fromLTRB(back ? 4 : 16, 4, actions.isEmpty ? 16 : 4, 4),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
          child: Row(children: [
            if (back)
              IconButton(
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(LucideIcons.arrowLeft, size: 24),
                tooltip: context.s.back,
                color: c.textSecondary,
              ),
            if (leading != null) ...[leading!, const SizedBox(width: 8)],
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Text(title, style: t.titleMedium?.copyWith(height: subtitle == null ? 26 / 18 : 24 / 18)),
                if (subtitle != null) Text(subtitle!, style: t.bodySmall?.copyWith(fontSize: 13, height: 18 / 13, color: c.textSecondary)),
              ]),
            ),
            ...actions,
          ]),
        ),
      ),
    );
  }
}

/// Icon-only header button with a tooltip / accessible label.
class RRIconButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  const RRIconButton({super.key, required this.icon, required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) =>
      IconButton(onPressed: onPressed, icon: Icon(icon, size: 22), tooltip: label, color: context.rr.textSecondary);
}

/// Dashed placeholder for the department logo. Never a real emblem.
class RRLogoSlot extends StatelessWidget {
  final double size;
  final bool showText;
  const RRLogoSlot({super.key, this.size = 56, this.showText = true});

  @override
  Widget build(BuildContext context) {
    final c = context.rr;
    return CustomPaint(
      painter: _DashedRectPainter(c.borderStrong, size > 40 ? 8 : 6),
      child: Container(
        width: size, height: size,
        decoration: BoxDecoration(color: c.surfaceAlt, borderRadius: BorderRadius.circular(size > 40 ? 8 : 6)),
        alignment: Alignment.center,
        child: showText
            ? Text('DEPT\nLOGO', textAlign: TextAlign.center,
                style: TextStyle(fontFamily: 'monospace', fontSize: 10, height: 1.2, color: c.textSecondary))
            : null,
      ),
    );
  }
}

class _DashedRectPainter extends CustomPainter {
  final Color color;
  final double radius;
  _DashedRectPainter(this.color, this.radius);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color..style = PaintingStyle.stroke..strokeWidth = 1;
    final path = Path()..addRRect(RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)));
    for (final metric in path.computeMetrics()) {
      for (double d = 0; d < metric.length; d += 6) {
        canvas.drawPath(metric.extractPath(d, d + 3), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedRectPainter old) => old.color != color;
}

/// Maps the design's icon keys (first-aid steps) to Lucide icons.
IconData rrIcon(String key) => switch (key) {
      'droplets' => LucideIcons.droplets,
      'shield-plus' => LucideIcons.shieldPlus,
      'ban' => LucideIcons.ban,
      'hospital' => LucideIcons.hospital,
      _ => LucideIcons.info,
    };

/// "RR-0142" style report number.
String reportNumber(int id) => 'RR-${id.toString().padLeft(4, '0')}';

/// Full width on phones, capped at [maxWidth] and centred on wider screens.
class RRMaxWidth extends StatelessWidget {
  final double maxWidth;
  final Widget child;
  const RRMaxWidth({super.key, this.maxWidth = 480, required this.child});

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, box) => Center(
          child: SizedBox(width: box.maxWidth < maxWidth ? box.maxWidth : maxWidth, child: child),
        ),
      );
}
