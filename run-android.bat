@echo off
set ANDROID_HOME=C:\Users\raksh\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%
cd /d C:\Users\raksh\netra-driver-guardian
npx expo run:android