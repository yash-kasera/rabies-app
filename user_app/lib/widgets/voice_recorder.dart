import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:cross_file/cross_file.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import '../providers/locale_provider.dart';
import '../theme/rr_theme.dart';
import 'rr.dart';

const maxVoiceSeconds = 120;

String _mmss(int s) => '${s ~/ 60}:${(s % 60).toString().padLeft(2, '0')}';

/// Optional spoken description of the bite, for people who can't type.
/// Low bitrate mono AAC (about 240 KB a minute) so it uploads on slow networks.
class VoiceRecorder extends StatefulWidget {
  /// Called with the recording (null when deleted) and its length in seconds.
  final void Function(Uint8List? bytes, int seconds) onChanged;
  const VoiceRecorder({super.key, required this.onChanged});

  @override
  State<VoiceRecorder> createState() => _VoiceRecorderState();
}

class _VoiceRecorderState extends State<VoiceRecorder> {
  // Created on first tap, so opening the form doesn't start the audio service.
  AudioRecorder? _rec;
  AudioRecorder get _recorder => _rec ??= AudioRecorder();
  AudioPlayer? _player;
  Timer? _timer;
  int _elapsed = 0;
  bool _recording = false;
  bool _starting = false;
  String? _path; // file path (Android) or blob URL (web)
  int _seconds = 0;
  bool _playing = false;

  @override
  void dispose() {
    _timer?.cancel();
    _rec?.dispose();
    _player?.dispose();
    super.dispose();
  }

  void _snack(String msg) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _start() async {
    final s = context.s;
    setState(() => _starting = true);
    try {
      if (!await _recorder.hasPermission()) {
        _snack(s.voiceNoMic);
        return;
      }
      await _player?.stop();
      // Web records Opus/WebM (what browsers support); phones record AAC in .m4a.
      final encoder = kIsWeb && await _recorder.isEncoderSupported(AudioEncoder.opus) ? AudioEncoder.opus : AudioEncoder.aacLc;
      final path = kIsWeb ? '' : '${(await getTemporaryDirectory()).path}/bite-voice-${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _recorder.start(
        RecordConfig(encoder: encoder, bitRate: 32000, sampleRate: 16000, numChannels: 1, noiseSuppress: true, autoGain: true),
        path: path,
      );
      if (!mounted) return;
      setState(() {
        _recording = true;
        _elapsed = 0;
      });
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() => _elapsed++);
        if (_elapsed >= maxVoiceSeconds) _stop();
      });
    } catch (_) {
      _snack(s.voiceError);
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  Future<void> _stop() async {
    final s = context.s;
    _timer?.cancel();
    try {
      final path = await _recorder.stop();
      if (path == null) throw StateError('no recording');
      final bytes = await XFile(path).readAsBytes();
      if (!mounted) return;
      final secs = _elapsed.clamp(1, maxVoiceSeconds);
      setState(() {
        _recording = false;
        _path = path;
        _seconds = secs;
      });
      widget.onChanged(bytes, secs);
    } catch (_) {
      if (mounted) setState(() => _recording = false);
      _snack(s.voiceError);
    }
  }

  Future<void> _togglePlay() async {
    final player = _player ??= AudioPlayer()
      ..onPlayerComplete.listen((_) {
        if (mounted) setState(() => _playing = false);
      });
    if (_playing) {
      await player.pause();
      setState(() => _playing = false);
      return;
    }
    await player.play(kIsWeb ? UrlSource(_path!) : DeviceFileSource(_path!));
    if (mounted) setState(() => _playing = true);
  }

  Future<void> _delete() async {
    await _player?.stop();
    setState(() {
      _path = null;
      _seconds = 0;
      _playing = false;
    });
    widget.onChanged(null, 0);
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final c = context.rr;
    final t = Theme.of(context).textTheme;

    if (_recording) {
      final left = maxVoiceSeconds - _elapsed;
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: c.dangerContainer,
          borderRadius: BorderRadius.circular(RRRadius.md),
          border: Border.all(color: c.dangerBorder),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Semantics(
            liveRegion: true,
            label: '${s.voiceRecording} ${_mmss(_elapsed)}',
            child: Row(children: [
              Container(width: 12, height: 12, decoration: BoxDecoration(color: c.danger, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text(s.voiceRecording, style: t.titleSmall?.copyWith(color: c.onDangerContainer)),
              const Spacer(),
              Text('${_mmss(_elapsed)} / ${_mmss(maxVoiceSeconds)}',
                  style: t.titleSmall?.copyWith(color: c.onDangerContainer, fontFeatures: const [FontFeature.tabularFigures()])),
            ]),
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(value: _elapsed / maxVoiceSeconds, color: c.danger, backgroundColor: c.surface),
          if (left <= 15) ...[
            const SizedBox(height: 6),
            Text(_mmss(left), style: t.bodySmall?.copyWith(color: c.onDangerContainer)),
          ],
          const SizedBox(height: 10),
          RRButton(s.voiceStop, icon: LucideIcons.square, kind: RRButtonKind.emergency, block: true, onPressed: _stop),
        ]),
      );
    }

    if (_path != null) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: c.successContainer,
          borderRadius: BorderRadius.circular(RRRadius.md),
          border: Border.all(color: c.successBorder),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Icon(LucideIcons.circleCheck, size: 20, color: c.onSuccessContainer),
            const SizedBox(width: 8),
            Expanded(child: Text(s.voiceSaved, style: t.titleSmall?.copyWith(color: c.onSuccessContainer))),
            Text(_mmss(_seconds), style: t.titleSmall?.copyWith(color: c.onSuccessContainer)),
          ]),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            RRButton(_playing ? s.voicePause : s.voicePlay, icon: _playing ? LucideIcons.pause : LucideIcons.play,
                kind: RRButtonKind.secondary, onPressed: _togglePlay),
            RRButton(s.voiceRedo, icon: LucideIcons.mic, kind: RRButtonKind.text, onPressed: _start),
            RRButton(s.voiceDelete, icon: LucideIcons.trash2, kind: RRButtonKind.text, onPressed: _delete),
          ]),
        ]),
      );
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      RRButton(s.voiceRecord, icon: LucideIcons.mic, kind: RRButtonKind.secondary, block: true, loading: _starting,
          onPressed: _starting ? null : _start),
      const SizedBox(height: 8),
      Text(s.voiceHint, style: t.bodySmall?.copyWith(color: c.textSecondary)),
    ]);
  }
}
