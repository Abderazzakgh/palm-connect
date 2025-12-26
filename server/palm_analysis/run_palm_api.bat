@echo off
chcp 65001 >nul
echo Starting Palm Analysis API Server...
echo.

REM التحقق من وجود Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM التحقق من وجود requirements.txt
if not exist "requirements.txt" (
    echo ERROR: requirements.txt not found
    pause
    exit /b 1
)

REM تثبيت الحزم
echo Installing required packages...
pip install -r requirements.txt

REM تشغيل الخادم
echo.
echo Starting Palm Analysis API Server on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
python api.py

pause