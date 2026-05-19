@echo off
title Parshwa Capital - BoE Document Generator
color 0A
cls

echo.
echo  ============================================================
echo   PARSHWA CAPITAL - Bill of Exchange Document Generator
echo  ============================================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js is NOT installed on this computer!
    echo.
    echo  Please download and install Node.js from:
    echo  https://nodejs.org  (click the big green LTS button)
    echo.
    echo  After installing, double-click this file again.
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js found.

:: Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo  [INFO] First time setup - installing packages...
    echo         (this only happens once, takes ~30 seconds)
    echo.
    npm install
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo  [ERROR] Failed to install packages. Check your internet connection.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Packages installed!
)

echo.
echo  ============================================================
echo   Starting server...
echo   The app will open in your browser automatically.
echo   Keep this window OPEN while using the app.
echo   To STOP the app, close this window.
echo  ============================================================
echo.

:: Wait a moment then open browser
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

:: Start the server
node server.js

:: If server crashes, show error
echo.
color 0C
echo  [ERROR] The server stopped unexpectedly.
pause
