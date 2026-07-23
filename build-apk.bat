@echo off
set ANDROID_HOME=D:\AndroidSDK\Sdk
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
cd /d C:\Users\zjc\Desktop\daily-review-local\android
call gradlew.bat assembleDebug
echo.
echo APK: android\app\build\outputs\apk\debug\app-debug.apk
pause
