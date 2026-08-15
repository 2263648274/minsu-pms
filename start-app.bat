@echo off
chcp 65001 >nul
start "PMS Start" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-app.ps1"
