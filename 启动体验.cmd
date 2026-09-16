@echo off
chcp 65001 >nul
if not exist "%~dp0本地体验服务.ps1" (
  echo Local preview service is missing. Please extract all files first.
  pause
  exit /b 1
)
start "" "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0本地体验服务.ps1"
