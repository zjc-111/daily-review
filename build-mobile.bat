@echo off
chcp 65001 >nul
echo =========================================
echo  Daily Review - 移动端构建
echo =========================================
echo.

REM 检测本机局域网IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "192.168.56" ^| findstr /v "192.168.64" ^| findstr "192.168."') do set LAN_IP=%%a
set LAN_IP=%LAN_IP: =%

if "%LAN_IP%"=="" (
    echo [!] 没检测到局域网IP，使用默认 192.168.2.5
    set LAN_IP=192.168.2.5
)

set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=D:\AndroidSDK\Sdk
set PATH=%JAVA_HOME%\bin;%PATH%

echo [>] 局域网IP: %LAN_IP%
echo [>] JAVA_HOME: %JAVA_HOME%
echo [>] 构建前端 (API=http://%LAN_IP%:3000/api) ...
echo.

set VITE_API_URL=http://%LAN_IP%:3000/api
call npx vite build --config vite.config.ts

if %ERRORLEVEL% neq 0 (
    echo [X] 前端构建失败
    pause
    exit /b 1
)

echo.
echo [>] 同步到 Android...
call npx cap sync android

if %ERRORLEVEL% neq 0 (
    echo [X] 安卓同步失败
    pause
    exit /b 1
)

echo.
echo [>] 编译 APK...
cd android
call gradlew.bat assembleDebug
cd ..

if %ERRORLEVEL% neq 0 (
    echo [X] APK 编译失败
    pause
    exit /b 1
)

REM 复制 APK 到桌面
set APK_SRC=android\app\build\outputs\apk\debug\app-debug.apk
set APK_DST=%USERPROFILE%\Desktop\DailyReview.apk
if exist "%APK_SRC%" (
    copy /Y "%APK_SRC%" "%APK_DST%" >nul
    echo.
    echo [√] APK 已复制到桌面: DailyReview.apk
)

echo.
echo =========================================
echo  [√] 完成！
echo.
echo  使用方法:
echo    1. 安装桌面上的 DailyReview.apk 到手机
echo    2. 启动后端: 双击桌面上的 启动后端.bat
echo    3. 确保手机和电脑连同一 WiFi
echo    4. 如果 IP 变了，重新运行本脚本
echo =========================================
pause
