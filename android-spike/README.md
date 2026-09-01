# Cleanroom native Android local-ADB spike

This is an isolated feasibility prototype. It does **not** replace the desktop Cleanroom application.

The question is deliberately narrow: can Cleanroom run on the Android device itself, pair with Android 11+ Wireless Debugging without a PC or Shizuku, reconnect with a persisted ADB identity, and execute the ADB commands the desktop product depends on?

## What this spike tests

- Wireless Debugging pairing through `libadb-android`
- a persisted RSA/X.509 ADB identity so killing the app does not force a new identity
- mDNS discovery of the device's TLS ADB endpoint after pairing
- user-package enumeration (`pm list packages -3`)
- current HOME/default-launcher resolution (`cmd package resolve-activity`)
- notification diagnostics (`dumpsys notification`)
- confirmation that commands execute with ADB shell identity (`id`)

The prototype intentionally uses short shell commands. `libadb-android` 3.1.1 currently has an open issue involving long ADB destinations, so production adoption requires either an upstream fix, a maintained fork, or a different transport implementation.

## Build

Open `android-spike/` as an Android Studio project, or run with Gradle 9.5+ and JDK 17+:

```sh
gradle :app:assembleDebug
```

The app targets API 36 and requires Android 11 (API 30) or newer.

## Manual device test

1. Install the debug APK.
2. Enable Developer options and Wireless debugging.
3. Open Cleanroom ADB Spike and Android Settings side by side. Android may invalidate the temporary pairing details when the pairing dialog disappears, so split screen is the safest test setup.
4. In Wireless debugging, choose **Pair device with pairing code**.
5. Enter the displayed pairing port and six-digit code in the spike.
6. Tap **Pair + connect**.
7. Tap **Run Cleanroom probes** and save the result.
8. Force-stop the spike, launch it again, and tap **Reconnect**. It should use the persisted ADB identity without repeating pairing.
9. Reboot the phone, re-enable Wireless debugging if Android disabled it, launch the spike, and test **Reconnect** again.

## Go / no-go criteria

A native Cleanroom direction is worth pursuing if all of the following are true on representative devices:

- pairing succeeds without a PC or a second helper app;
- reconnect after app process death is reliable;
- package, HOME and notification probes succeed with useful output;
- reboot recovery is understandable enough for a technician workflow;
- Samsung and at least one near-stock Android device behave consistently enough that the setup can be guided in-product.

If pairing/discovery/reconnect is unreliable in ordinary support-counter conditions, the desktop ADB application remains the better architecture.

## Not tested yet

- uninstall/remediation, intentionally deferred until read-only commands are reliable;
- OEM-specific Wireless Debugging navigation;
- multiple Android versions and vendors;
- keeping Wireless Debugging enabled across reboots;
- production storage of the ADB private key. The spike stores it in app-private preferences for convenience; a production implementation should use Android Keystore-backed protection.

## Dependency note

`libadb-android` is dual licensed GPL-3.0-or-later / Apache-2.0, with additional transitive licensing considerations documented upstream. A production decision must include a dependency/license review rather than treating a feasibility dependency as permanent architecture.
