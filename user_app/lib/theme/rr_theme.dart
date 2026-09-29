// Rabies Response — Flutter Material 3 theme, from the design system (tokens/tokens.json).
// System fonts only (Roboto + Noto Sans Devanagari ship with Android) — nothing is downloaded.
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

@immutable
class RRColors extends ThemeExtension<RRColors> {
  final Color background, surface, surfaceAlt, border, borderStrong;
  final Color textPrimary, textSecondary, textDisabled;
  final Color primary, primaryHover, primaryPressed, onPrimary, primaryContainer, onPrimaryContainer, primaryBorder;
  final Color secondary, secondaryContainer, onSecondaryContainer;
  final Color emergency, emergencyHover, emergencyPressed, onEmergency, emergencyContainer, onEmergencyContainer;
  final Color danger, dangerContainer, onDangerContainer, dangerBorder;
  final Color warning, warningContainer, onWarningContainer, warningBorder;
  final Color orange, orangeContainer, onOrangeContainer, orangeBorder;
  final Color success, successContainer, onSuccessContainer, successBorder;
  final Color info, infoContainer, onInfoContainer, infoBorder;
  final Color neutral, neutralContainer, onNeutralContainer, neutralBorder;
  final Color focus, disabledBg, disabledText, inverseSurface, onInverse, scrim, skeleton;

  const RRColors({
    required this.background, required this.surface, required this.surfaceAlt, required this.border, required this.borderStrong,
    required this.textPrimary, required this.textSecondary, required this.textDisabled,
    required this.primary, required this.primaryHover, required this.primaryPressed, required this.onPrimary,
    required this.primaryContainer, required this.onPrimaryContainer, required this.primaryBorder,
    required this.secondary, required this.secondaryContainer, required this.onSecondaryContainer,
    required this.emergency, required this.emergencyHover, required this.emergencyPressed, required this.onEmergency,
    required this.emergencyContainer, required this.onEmergencyContainer,
    required this.danger, required this.dangerContainer, required this.onDangerContainer, required this.dangerBorder,
    required this.warning, required this.warningContainer, required this.onWarningContainer, required this.warningBorder,
    required this.orange, required this.orangeContainer, required this.onOrangeContainer, required this.orangeBorder,
    required this.success, required this.successContainer, required this.onSuccessContainer, required this.successBorder,
    required this.info, required this.infoContainer, required this.onInfoContainer, required this.infoBorder,
    required this.neutral, required this.neutralContainer, required this.onNeutralContainer, required this.neutralBorder,
    required this.focus, required this.disabledBg, required this.disabledText,
    required this.inverseSurface, required this.onInverse, required this.scrim, required this.skeleton,
  });

  static const light = RRColors(
    background: Color(0xFFF7F3EC), surface: Color(0xFFFFFFFF), surfaceAlt: Color(0xFFF0EADF),
    border: Color(0xFFDED5C6), borderStrong: Color(0xFF8A7F6E),
    textPrimary: Color(0xFF1B2428), textSecondary: Color(0xFF4D5A60), textDisabled: Color(0xFF7A8286),
    primary: Color(0xFF1E4D5A), primaryHover: Color(0xFF173F4A), primaryPressed: Color(0xFF11323B), onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFDDEBEC), onPrimaryContainer: Color(0xFF0F3440), primaryBorder: Color(0xFF9FC3C8),
    secondary: Color(0xFF3E6A5A), secondaryContainer: Color(0xFFE0ECE5), onSecondaryContainer: Color(0xFF173A2E),
    emergency: Color(0xFFC0271D), emergencyHover: Color(0xFFA11F17), emergencyPressed: Color(0xFF85190F), onEmergency: Color(0xFFFFFFFF),
    emergencyContainer: Color(0xFFFDE7E4), onEmergencyContainer: Color(0xFF7A1610),
    danger: Color(0xFFB3261E), dangerContainer: Color(0xFFFCE8E6), onDangerContainer: Color(0xFF7A1712), dangerBorder: Color(0xFFEFA59E),
    warning: Color(0xFF8A5300), warningContainer: Color(0xFFFFF0D1), onWarningContainer: Color(0xFF5C3700), warningBorder: Color(0xFFE3B45A),
    orange: Color(0xFF9A3F0C), orangeContainer: Color(0xFFFDE6D6), onOrangeContainer: Color(0xFF6B2A06), orangeBorder: Color(0xFFEFA77A),
    success: Color(0xFF1E6B3A), successContainer: Color(0xFFE2F2E6), onSuccessContainer: Color(0xFF114625), successBorder: Color(0xFF93CBA3),
    info: Color(0xFF1F5A96), infoContainer: Color(0xFFE3EDF8), onInfoContainer: Color(0xFF123D69), infoBorder: Color(0xFF9DBEE3),
    neutral: Color(0xFF56626A), neutralContainer: Color(0xFFEDEAE4), onNeutralContainer: Color(0xFF333D43), neutralBorder: Color(0xFFC4BDB1),
    focus: Color(0xFF1F5A96), disabledBg: Color(0xFFE6E1D8), disabledText: Color(0xFF7A8286),
    inverseSurface: Color(0xFF1B2428), onInverse: Color(0xFFF7F3EC), scrim: Color(0x8F11171A), skeleton: Color(0xFFE7DFD2),
  );

  static const dark = RRColors(
    background: Color(0xFF0F1518), surface: Color(0xFF172024), surfaceAlt: Color(0xFF1F2A2F),
    border: Color(0xFF2E3B42), borderStrong: Color(0xFF71818A),
    textPrimary: Color(0xFFEDF1F2), textSecondary: Color(0xFFB0BCC2), textDisabled: Color(0xFF6F7C82),
    primary: Color(0xFF86C9D3), primaryHover: Color(0xFFA2D7DF), primaryPressed: Color(0xFFBFE4EA), onPrimary: Color(0xFF06323B),
    primaryContainer: Color(0xFF1C4852), onPrimaryContainer: Color(0xFFCDEEF3), primaryBorder: Color(0xFF3E6F79),
    secondary: Color(0xFF9CCBB6), secondaryContainer: Color(0xFF1E3B31), onSecondaryContainer: Color(0xFFCFEBDD),
    emergency: Color(0xFFCC3328), emergencyHover: Color(0xFFB42A20), emergencyPressed: Color(0xFF9A2219), onEmergency: Color(0xFFFFFFFF),
    emergencyContainer: Color(0xFF45140F), onEmergencyContainer: Color(0xFFFFD9D3),
    danger: Color(0xFFFF8A7F), dangerContainer: Color(0xFF47150F), onDangerContainer: Color(0xFFFFDAD4), dangerBorder: Color(0xFF8C3A31),
    warning: Color(0xFFF0C064), warningContainer: Color(0xFF3A2A08), onWarningContainer: Color(0xFFFFE3A6), warningBorder: Color(0xFF7A5A1A),
    orange: Color(0xFFF5A06B), orangeContainer: Color(0xFF40200A), onOrangeContainer: Color(0xFFFFDCC4), orangeBorder: Color(0xFF84461F),
    success: Color(0xFF7FD49B), successContainer: Color(0xFF143722), onSuccessContainer: Color(0xFFC5EFD1), successBorder: Color(0xFF2F6B45),
    info: Color(0xFF93BEF0), infoContainer: Color(0xFF152D4A), onInfoContainer: Color(0xFFD4E5FA), infoBorder: Color(0xFF365D8C),
    neutral: Color(0xFFAAB5BA), neutralContainer: Color(0xFF263136), onNeutralContainer: Color(0xFFDDE3E6), neutralBorder: Color(0xFF4A585F),
    focus: Color(0xFF93BEF0), disabledBg: Color(0xFF232D32), disabledText: Color(0xFF7E8A90),
    inverseSurface: Color(0xFFEDF1F2), onInverse: Color(0xFF172024), scrim: Color(0xA3000000), skeleton: Color(0xFF253137),
  );

  @override
  RRColors copyWith() => this;
  @override
  RRColors lerp(ThemeExtension<RRColors>? other, double t) => (t < 0.5 || other is! RRColors) ? this : other;
}

extension RRContext on BuildContext {
  RRColors get rr => Theme.of(this).extension<RRColors>()!;
}

/// Tone of a status badge / notice box. Colours come from [RRTone.colors].
enum RRTone { neutral, info, primary, warning, orange, success, danger, dangerSolid }

extension RRToneColors on RRTone {
  /// (background, foreground, border) — matches .rr-badge--* in components.css.
  (Color, Color, Color) colors(RRColors c) => switch (this) {
        RRTone.neutral => (c.neutralContainer, c.onNeutralContainer, c.neutralBorder),
        RRTone.info => (c.infoContainer, c.onInfoContainer, c.infoBorder),
        RRTone.primary => (c.primaryContainer, c.onPrimaryContainer, c.primaryBorder),
        RRTone.warning => (c.warningContainer, c.onWarningContainer, c.warningBorder),
        RRTone.orange => (c.orangeContainer, c.onOrangeContainer, c.orangeBorder),
        RRTone.success => (c.successContainer, c.onSuccessContainer, c.successBorder),
        RRTone.danger => (c.dangerContainer, c.onDangerContainer, c.dangerBorder),
        RRTone.dangerSolid => (c.emergency, c.onEmergency, c.emergency),
      };
}

/// Shared status map, keyed by the API's enum values. Identical in all three products.
class RRStatus {
  final RRTone tone;
  final IconData icon;
  final int? level;
  const RRStatus(this.tone, this.icon, [this.level]);

  static const report = <String, RRStatus>{
    'Reported': RRStatus(RRTone.warning, LucideIcons.circleAlert),
    'Accepted': RRStatus(RRTone.info, LucideIcons.check),
    'UnderTreatment': RRStatus(RRTone.primary, LucideIcons.syringe),
    'Completed': RRStatus(RRTone.success, LucideIcons.circleCheck),
    'Cancelled': RRStatus(RRTone.neutral, LucideIcons.circleSlash),
  };
  static const severity = <String, RRStatus>{
    'MinorScratch': RRStatus(RRTone.neutral, LucideIcons.info, 1),
    'BleedingWound': RRStatus(RRTone.warning, LucideIcons.circleAlert, 2),
    'DeepWound': RRStatus(RRTone.orange, LucideIcons.triangleAlert, 3),
    'MultipleBites': RRStatus(RRTone.dangerSolid, LucideIcons.siren, 4),
  };
  static const notice = <String, RRStatus>{
    'OutbreakAlert': RRStatus(RRTone.danger, LucideIcons.siren),
    'GeneralAwareness': RRStatus(RRTone.info, LucideIcons.megaphone),
    'NewHospital': RRStatus(RRTone.success, LucideIcons.hospital),
    'MaintenanceNotice': RRStatus(RRTone.warning, LucideIcons.wrench),
  };
}

class RRSpace { static const s1 = 4.0, s2 = 8.0, s3 = 12.0, s4 = 16.0, s5 = 20.0, s6 = 24.0, s8 = 32.0, s10 = 40.0, s12 = 48.0, s16 = 64.0; }
class RRRadius { static const xs = 4.0, sm = 8.0, md = 12.0, lg = 16.0, xl = 24.0, pill = 999.0; }
class RRMotion { static const fast = Duration(milliseconds: 120), base = Duration(milliseconds: 150); static const curve = Cubic(0.2, 0, 0, 1); }

class RRTheme {
  static ThemeData light() => _build(Brightness.light, RRColors.light);
  static ThemeData dark() => _build(Brightness.dark, RRColors.dark);

  static ThemeData _build(Brightness b, RRColors c) {
    final scheme = ColorScheme(
      brightness: b,
      primary: c.primary, onPrimary: c.onPrimary,
      primaryContainer: c.primaryContainer, onPrimaryContainer: c.onPrimaryContainer,
      secondary: c.secondary, onSecondary: b == Brightness.light ? const Color(0xFFFFFFFF) : c.background,
      secondaryContainer: c.secondaryContainer, onSecondaryContainer: c.onSecondaryContainer,
      tertiary: c.emergency, onTertiary: c.onEmergency, // tertiary = emergency (report a bite / SOS only)
      tertiaryContainer: c.emergencyContainer, onTertiaryContainer: c.onEmergencyContainer,
      error: c.danger, onError: b == Brightness.light ? const Color(0xFFFFFFFF) : c.background,
      errorContainer: c.dangerContainer, onErrorContainer: c.onDangerContainer,
      surface: c.surface, onSurface: c.textPrimary, onSurfaceVariant: c.textSecondary,
      surfaceContainerLowest: c.surface, surfaceContainerLow: c.background, surfaceContainer: c.surfaceAlt,
      surfaceContainerHigh: c.surfaceAlt, surfaceContainerHighest: c.surfaceAlt,
      outline: c.borderStrong, outlineVariant: c.border,
      inverseSurface: c.inverseSurface, onInverseSurface: c.onInverse,
      inversePrimary: b == Brightness.light ? const Color(0xFF8FD0DA) : const Color(0xFF1E4D5A),
      shadow: const Color(0x1A1B2428), scrim: c.scrim, surfaceTint: Colors.transparent,
    );
    const w6 = FontWeight.w600;
    final text = const TextTheme(
      headlineMedium: TextStyle(fontSize: 28, height: 36 / 28, fontWeight: w6),
      headlineSmall: TextStyle(fontSize: 24, height: 32 / 24, fontWeight: w6),
      titleLarge: TextStyle(fontSize: 20, height: 28 / 20, fontWeight: w6),
      titleMedium: TextStyle(fontSize: 18, height: 26 / 18, fontWeight: w6),
      titleSmall: TextStyle(fontSize: 16, height: 24 / 16, fontWeight: w6),
      bodyLarge: TextStyle(fontSize: 18, height: 28 / 18),
      bodyMedium: TextStyle(fontSize: 16, height: 24 / 16),
      bodySmall: TextStyle(fontSize: 14, height: 20 / 14),
      labelLarge: TextStyle(fontSize: 16, height: 22 / 16, fontWeight: w6),
      labelMedium: TextStyle(fontSize: 14, height: 20 / 14, fontWeight: w6),
      labelSmall: TextStyle(fontSize: 12, height: 16 / 12),
    ).apply(bodyColor: c.textPrimary, displayColor: c.textPrimary);
    const pill = StadiumBorder();
    const btnPad = EdgeInsets.symmetric(horizontal: 20, vertical: 10);
    const minBtn = Size(48, 48);
    OutlineInputBorder ob(Color col, [double w = 1]) =>
        OutlineInputBorder(borderRadius: BorderRadius.circular(RRRadius.md), borderSide: BorderSide(color: col, width: w));
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: c.background,
      textTheme: text,
      extensions: [c],
      splashFactory: NoSplash.splashFactory, // no ripple; pressed = colour change only
      // Opacity-only page changes on every platform (no slides — design motion rule).
      pageTransitionsTheme: PageTransitionsTheme(builders: {
        for (final p in TargetPlatform.values) p: const _FadePageTransitionsBuilder(),
      }),
      materialTapTargetSize: MaterialTapTargetSize.padded,
      visualDensity: VisualDensity.standard,
      dividerTheme: DividerThemeData(color: c.border, thickness: 1, space: 1),
      appBarTheme: AppBarTheme(
        backgroundColor: c.surface, foregroundColor: c.textPrimary, elevation: 0, scrolledUnderElevation: 0,
        titleTextStyle: text.titleMedium, shape: Border(bottom: BorderSide(color: c.border)),
      ),
      cardTheme: CardThemeData(
        color: c.surface, elevation: 0, margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(RRRadius.lg), side: BorderSide(color: c.border)),
      ),
      filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(
        minimumSize: minBtn, padding: btnPad, shape: pill, textStyle: text.labelLarge, animationDuration: RRMotion.fast,
        backgroundColor: c.primary, foregroundColor: c.onPrimary,
        disabledBackgroundColor: c.disabledBg, disabledForegroundColor: c.disabledText,
      )),
      outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(
        minimumSize: minBtn, padding: btnPad, shape: pill, foregroundColor: c.primary, backgroundColor: c.surface,
        side: BorderSide(color: c.borderStrong), textStyle: text.labelLarge,
      )),
      textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(
        minimumSize: minBtn, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12), shape: pill,
        foregroundColor: c.primary, textStyle: text.labelLarge?.copyWith(decoration: TextDecoration.underline),
      )),
      iconButtonTheme: IconButtonThemeData(style: IconButton.styleFrom(minimumSize: minBtn, foregroundColor: c.textSecondary)),
      inputDecorationTheme: InputDecorationTheme(
        filled: true, fillColor: c.surface, isDense: false,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: ob(c.borderStrong), enabledBorder: ob(c.borderStrong), focusedBorder: ob(c.focus, 2),
        errorBorder: ob(c.danger, 2), focusedErrorBorder: ob(c.danger, 2), disabledBorder: ob(c.border),
        hintStyle: text.bodyMedium?.copyWith(color: c.textSecondary),
        helperStyle: text.bodySmall?.copyWith(color: c.textSecondary),
        errorStyle: text.bodySmall?.copyWith(color: c.danger, fontWeight: w6), errorMaxLines: 3, helperMaxLines: 3,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: c.surface, elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(RRRadius.lg), side: BorderSide(color: c.border)),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.surface, elevation: 0, modalBarrierColor: c.scrim,
        shape: RoundedRectangleBorder(borderRadius: const BorderRadius.vertical(top: Radius.circular(RRRadius.xl)), side: BorderSide(color: c.border)),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: c.inverseSurface, contentTextStyle: text.bodyMedium?.copyWith(color: c.onInverse),
        actionTextColor: scheme.inversePrimary, behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(RRRadius.md)), elevation: 1,
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: c.primary, linearTrackColor: c.surfaceAlt),
    );
  }
}

class _FadePageTransitionsBuilder extends PageTransitionsBuilder {
  const _FadePageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(PageRoute<T> route, BuildContext context, Animation<double> animation,
          Animation<double> secondaryAnimation, Widget child) =>
      FadeTransition(opacity: CurvedAnimation(parent: animation, curve: RRMotion.curve), child: child);
}
