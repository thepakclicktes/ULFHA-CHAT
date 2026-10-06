#!/bin/bash
set -e

APPLET_DIR="$(pwd)"
echo "=== Step 1: Setting up Android SDK in $APPLET_DIR ==="
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
mkdir -p /opt/android-sdk/cmdline-tools

if [ ! -d "/opt/android-sdk/cmdline-tools/latest" ]; then
    echo "Downloading Command-line tools..."
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip
    unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools-extracted
    mv /tmp/cmdline-tools-extracted/cmdline-tools /opt/android-sdk/cmdline-tools/latest
    rm -rf /tmp/cmdline-tools.zip /tmp/cmdline-tools-extracted
fi

export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

echo "Accepting licenses..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true

echo "Installing platforms and build-tools..."
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" > /dev/null 2>&1

echo "=== Step 2: Setting up Gradle ==="
if [ ! -d "/opt/gradle" ]; then
    echo "Downloading Gradle 8.2..."
    wget -q https://services.gradle.org/distributions/gradle-8.2-bin.zip -O /tmp/gradle.zip
    unzip -q /tmp/gradle.zip -d /opt
    mv /opt/gradle-8.2 /opt/gradle
    rm -rf /tmp/gradle.zip
fi

export PATH=$PATH:/opt/gradle/bin

echo "=== Step 3: Building APK in $APPLET_DIR/android ==="
cd "$APPLET_DIR/android"

# Create local.properties
echo "sdk.dir=/opt/android-sdk" > local.properties

gradle assembleDebug --no-daemon

if [ -f "$APPLET_DIR/android/app/build/outputs/apk/debug/app-debug.apk" ]; then
    cp "$APPLET_DIR/android/app/build/outputs/apk/debug/app-debug.apk" "$APPLET_DIR/public/UlfahChat.apk"
    echo "=== SUCCESS! APK built at $APPLET_DIR/public/UlfahChat.apk ==="
    ls -lh "$APPLET_DIR/public/UlfahChat.apk"
else
    echo "APK build finished but output file not found."
fi
