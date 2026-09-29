import 'dart:ffi' show Abi;

String? currentAbi() => switch (Abi.current()) {
      Abi.androidArm64 => 'arm64-v8a',
      Abi.androidArm => 'armeabi-v7a',
      _ => null,
    };
