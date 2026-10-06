#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLS_DIR="$ROOT_DIR/android_tools"
mkdir -p "$TOOLS_DIR"

echo "=== Step 1: Setting up Android SDK in $TOOLS_DIR/android-sdk ==="
export ANDROID_HOME="$TOOLS_DIR/android-sdk"
export ANDROID_SDK_ROOT="$TOOLS_DIR/android-sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"

if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
    echo "Downloading Command-line tools..."
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip
    unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools-extracted
    mv /tmp/cmdline-tools-extracted/cmdline-tools "$ANDROID_HOME/cmdline-tools/latest"
    rm -rf /tmp/cmdline-tools.zip /tmp/cmdline-tools-extracted
fi

export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

echo "Accepting licenses..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true

echo "Installing platforms and build-tools..."
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" > /dev/null 2>&1

echo "=== Step 2: Setting up Gradle 8.2 ==="
if [ ! -d "$TOOLS_DIR/gradle-8.2" ]; then
    echo "Downloading Gradle 8.2..."
    wget -q https://services.gradle.org/distributions/gradle-8.2-bin.zip -O /tmp/gradle.zip
    unzip -q /tmp/gradle.zip -d "$TOOLS_DIR"
    rm -rf /tmp/gradle.zip
fi

export PATH="$PATH:$TOOLS_DIR/gradle-8.2/bin"

echo "=== Step 3: Building APK in $ROOT_DIR/android ==="
cd "$ROOT_DIR/android"

# Create local.properties
echo "sdk.dir=$ANDROID_HOME" > local.properties

gradle assembleDebug --no-daemon

if [ -f "$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk" ]; then
    cp "$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk" "$ROOT_DIR/public/UlfahChat.apk"
    echo "=== SUCCESS! APK built at $ROOT_DIR/public/UlfahChat.apk ==="
    ls -lh "$ROOT_DIR/public/UlfahChat.apk"
else
    echo "APK build finished but output file not found."
fi
