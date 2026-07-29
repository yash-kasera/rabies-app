import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const Color bgLight = Color(0xFFFAF6F0);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceAltLight = Color(0xFFF0E6D8);
  static const Color primaryLight = Color(0xFF6B4423);
  static const Color primaryHoverLight = Color(0xFF5A3A1D);
  static const Color secondaryLight = Color(0xFFA97C50);
  static const Color borderLight = Color(0xFFE3D5C3);
  static const Color textPrimaryLight = Color(0xFF2B2118);
  static const Color textSecondaryLight = Color(0xFF6E6259);
  static const Color successLight = Color(0xFF4B6B3A);
  static const Color warningLight = Color(0xFFB08325);
  static const Color dangerLight = Color(0xFFA13D2E);
  static const Color emergencyLight = Color(0xFFC0392B);

  static const Color bgDark = Color(0xFF1C1A18);
  static const Color surfaceDark = Color(0xFF272422);
  static const Color surfaceAltDark = Color(0xFF332D28);
  static const Color primaryDark = Color(0xFFD9A468);
  static const Color primaryHoverDark = Color(0xFFE8B87F);
  static const Color secondaryDark = Color(0xFFB08A5D);
  static const Color borderDark = Color(0xFF453E37);
  static const Color textPrimaryDark = Color(0xFFF2EBE1);
  static const Color textSecondaryDark = Color(0xFFB8AC9E);
  static const Color successDark = Color(0xFF8FAE72);
  static const Color warningDark = Color(0xFFD6A94B);
  static const Color dangerDark = Color(0xFFD3705C);
  static const Color emergencyDark = Color(0xFFE0574A);
}

class AppTheme {
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: AppColors.bgLight,
    colorScheme: ColorScheme.light(
      primary: AppColors.primaryLight,
      secondary: AppColors.secondaryLight,
      surface: AppColors.surfaceLight,
      error: AppColors.dangerLight,
    ),
    textTheme: GoogleFonts.interTextTheme().copyWith(
      headlineLarge: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.textPrimaryLight, height: 1.5),
      headlineMedium: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimaryLight, height: 1.5),
      titleLarge: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimaryLight, height: 1.5),
      titleMedium: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimaryLight, height: 1.5),
      bodyLarge: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: AppColors.textPrimaryLight, height: 1.5),
      bodyMedium: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textPrimaryLight, height: 1.5),
      labelSmall: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.textSecondaryLight, height: 1.5),
    ),
    cardTheme: CardThemeData(
      color: AppColors.surfaceLight,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.borderLight),
      ),
    ),
    appBarTheme: const AppBarThemeData(
      backgroundColor: AppColors.bgLight,
      foregroundColor: AppColors.textPrimaryLight,
      elevation: 0,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.surfaceLight,
      selectedItemColor: AppColors.primaryLight,
      unselectedItemColor: AppColors.textSecondaryLight,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceLight,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.borderLight),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.borderLight),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.primaryLight, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primaryLight,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
  );

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.bgDark,
    colorScheme: ColorScheme.dark(
      primary: AppColors.primaryDark,
      secondary: AppColors.secondaryDark,
      surface: AppColors.surfaceDark,
      error: AppColors.dangerDark,
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
      headlineLarge: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.textPrimaryDark, height: 1.5),
      headlineMedium: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimaryDark, height: 1.5),
      titleLarge: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimaryDark, height: 1.5),
      titleMedium: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimaryDark, height: 1.5),
      bodyLarge: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: AppColors.textPrimaryDark, height: 1.5),
      bodyMedium: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.textPrimaryDark, height: 1.5),
      labelSmall: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.textSecondaryDark, height: 1.5),
    ),
    cardTheme: CardThemeData(
      color: AppColors.surfaceDark,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.borderDark),
      ),
    ),
    appBarTheme: const AppBarThemeData(
      backgroundColor: AppColors.bgDark,
      foregroundColor: AppColors.textPrimaryDark,
      elevation: 0,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.surfaceDark,
      selectedItemColor: AppColors.primaryDark,
      unselectedItemColor: AppColors.textSecondaryDark,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceDark,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.borderDark),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.borderDark),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.primaryDark, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primaryDark,
        foregroundColor: AppColors.bgDark,
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
  );
}