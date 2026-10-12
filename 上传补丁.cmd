@echo off
setlocal DisableDelayedExpansion
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0scripts\upload-patch.ps1" "%~1"
pause
