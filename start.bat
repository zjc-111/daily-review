@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ╔══════════════════════════════════════════════╗
echo ║       Daily Review — 每日复盘 启动器          ║
echo ║       Python 后端 + React 前端                ║
echo ╚══════════════════════════════════════════════╝
echo.

:: 1. Install frontend dependencies (if needed)
if not exist "node_modules\" (
    echo [1/3] 安装前端依赖...
    call npm install
) else (
    echo [1/3] 前端依赖已就绪 √
)

:: 2. Start Python backend
echo [2/3] 启动 Python 后端 (FastAPI :3000)...
start "DailyReview-Backend" cmd /c "cd /d %~dp0server-py && python -m uvicorn main:app --host localhost --port 3000 --reload"

:: 3. Wait then start frontend
timeout /t 2 /nobreak >nul
echo [3/3] 启动前端 (Vite :5173)...
start "DailyReview-Frontend" cmd /c "cd /d %~dp0 && npx vite --host"

echo.
echo ═══════════════════════════════════════
echo   后端 API : http://localhost:3000
echo   前端页面 : http://localhost:5173
echo ═══════════════════════════════════════
echo.
echo 测试验证码：1234
echo 按任意键关闭此窗口 (不影响服务器运行)
pause >nul
