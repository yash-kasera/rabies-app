import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ota_update/ota_update.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../l10n/strings.dart';
import '../providers/locale_provider.dart';
import '../theme/rr_theme.dart';
import '../widgets/rr.dart';
import 'app_config.dart';
import 'device_abi.dart';

/// In-app updates for the sideloaded Android APK. The latest version is listed in the
/// remote config; the new APK is downloaded inside the app, its SHA-256 checked, and
/// handed to Android's installer (the user taps Install once; data is kept).
class Updater {
  static bool _prompted = false;

  /// Checks once per app launch. [context] must be below the MaterialApp.
  static Future<void> check(BuildContext context) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android || _prompted) return;
    await AppConfig.refresh();
    final latest = AppConfig.android;
    if (latest == null) return;
    final info = await PackageInfo.fromPlatform();
    // Per-chip APKs carry an offset versionCode (1000 + n for 32-bit ARM, 2000 + n for 64-bit).
    final current = (int.tryParse(info.buildNumber) ?? 0) % 1000;
    final newest = (latest['versionCode'] as num?)?.toInt() ?? 0;
    final minimum = (latest['minVersionCode'] as num?)?.toInt() ?? 0;
    // The smaller APK built for this phone's chip; the universal one as a fallback.
    final abi = currentAbi();
    final perAbi = latest['apks'] is Map ? (latest['apks'] as Map)[abi] : null;
    final apkUrl = perAbi is Map ? perAbi['url'] : latest['apkUrl'];
    final sha256 = perAbi is Map ? perAbi['sha256'] : latest['sha256'];
    if (newest <= current || apkUrl is! String || !apkUrl.startsWith('https://')) return;
    if (!context.mounted) return;
    _prompted = true;
    await showDialog<void>(
      context: context,
      barrierDismissible: current >= minimum,
      builder: (_) => _UpdateDialog(
        versionName: '${latest['versionName'] ?? newest}',
        apkUrl: apkUrl,
        sha256: sha256 as String?,
        required: current < minimum,
      ),
    );
  }
}

class _UpdateDialog extends StatefulWidget {
  final String versionName;
  final String apkUrl;
  final String? sha256;
  final bool required;
  const _UpdateDialog({required this.versionName, required this.apkUrl, this.sha256, required this.required});

  @override
  State<_UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends State<_UpdateDialog> {
  int? _progress; // null = not started
  bool _installing = false;
  bool _failed = false;
  StreamSubscription<OtaEvent>? _sub;

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  void _start() {
    setState(() {
      _progress = 0;
      _failed = false;
    });
    try {
      _sub = OtaUpdate()
          .execute(widget.apkUrl, destinationFilename: 'rabies-response.apk', sha256checksum: widget.sha256)
          .listen((event) {
        if (!mounted) return;
        switch (event.status) {
          case OtaStatus.DOWNLOADING:
            setState(() => _progress = int.tryParse(event.value ?? '') ?? _progress);
          case OtaStatus.INSTALLING:
          case OtaStatus.INSTALLATION_DONE:
            setState(() => _installing = true);
          case OtaStatus.ALREADY_RUNNING_ERROR:
            break;
          default:
            setState(() {
              _failed = true;
              _progress = null;
            });
        }
      }, onError: (_) {
        if (mounted) setState(() { _failed = true; _progress = null; });
      });
    } catch (_) {
      setState(() { _failed = true; _progress = null; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final S s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;
    final busy = _progress != null && !_installing;
    return PopScope(
      canPop: !widget.required && !busy,
      child: Dialog(
        insetPadding: const EdgeInsets.all(16),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Center(
                child: Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: c.primaryContainer),
                  child: Icon(LucideIcons.download, size: 28, color: c.onPrimaryContainer),
                ),
              ),
              const SizedBox(height: 12),
              Text(s.updateTitle, style: t.titleLarge, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(widget.required ? s.updateRequired : s.updateBody(widget.versionName),
                  style: t.bodyMedium?.copyWith(color: c.textSecondary), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              if (_failed) ...[
                Text(s.updateFailed, style: t.bodyMedium?.copyWith(color: c.danger), textAlign: TextAlign.center),
                const SizedBox(height: 12),
              ],
              if (busy) ...[
                LinearProgressIndicator(value: (_progress ?? 0) / 100, color: c.primary, backgroundColor: c.surfaceAlt),
                const SizedBox(height: 8),
                Text(s.updateDownloading(_progress ?? 0), style: t.bodySmall, textAlign: TextAlign.center),
              ] else if (_installing)
                Text(s.updateInstall, style: t.bodyMedium?.copyWith(fontWeight: FontWeight.w600), textAlign: TextAlign.center)
              else ...[
                RRButton(s.updateNow, icon: LucideIcons.download, block: true, onPressed: _start),
                if (!widget.required) ...[
                  const SizedBox(height: 8),
                  RRButton(s.updateLater, kind: RRButtonKind.text, block: true, onPressed: () => Navigator.of(context).pop()),
                ],
              ],
              if (_installing && !widget.required) ...[
                const SizedBox(height: 8),
                RRButton(s.updateLater, kind: RRButtonKind.text, block: true, onPressed: () => Navigator.of(context).pop()),
              ],
              if (_installing && widget.required) ...[
                const SizedBox(height: 8),
                RRButton(s.updateNow, icon: LucideIcons.refreshCw, kind: RRButtonKind.secondary, block: true, onPressed: _start),
              ],
            ]),
          ),
        ),
      ),
    );
  }
}
