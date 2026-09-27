@echo off
rem Gets the latest version of the Arizon Yadak site from GitHub, then starts it.
rem Double-click this file whenever you are told there is an update.
rem Your data (products, orders, database, uploaded images, .env) is not touched.
chcp 65001 >nul

rem The update may replace this very file, and Windows reads batch files line by line while
rem running them, so the real work continues from a temporary copy.
if /i not "%~1"=="--from-temp" (
  copy /y "%~f0" "%TEMP%\arizon-update-site.cmd" >nul
  "%TEMP%\arizon-update-site.cmd" --from-temp "%~dp0"
)
set "SITE_DIR=%~2"
cd /d "%SITE_DIR%" || goto :error
set "PATH=%ProgramFiles%\Git\cmd;%ProgramFiles%\nodejs;%PATH%"

where git >nul 2>nul || (
  echo Git is not installed on this computer.
  goto :error
)

rem Stop the site if it is running (updating while it runs can fail: files in use).
rem Only this project's Next.js processes are stopped; the database window keeps running.
call :site_running && (
  echo Stopping the running site...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$site = '%SITE_DIR%'.ToLower(); Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -and $_.CommandLine.ToLower().Contains($site) -and $_.CommandLine.ToLower().Contains('next') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
  timeout /t 3 /nobreak >nul
)
call :site_running && (
  echo Another program is using port 3000. Close the site window, then double-click this file again.
  goto :error
)

echo Downloading the latest version...
git fetch origin main || goto :error

rem Code files edited on this computer by accident are set aside (recoverable with "git stash list").
git diff --quiet HEAD || (
  echo Setting aside local changes to code files...
  git stash push -m "auto-saved by update-site before updating" || goto :error
)

git checkout main || goto :error
git merge --ff-only origin/main || goto :error

echo.
echo Updated. Starting the site...
echo.
call "%SITE_DIR%start-local.cmd"
exit

:error
echo.
echo Update did not finish. Take a screenshot of this window and send it.
pause
exit

rem Succeeds (exit code 0) when something answers on port 3000.
:site_running
node -e "const s=require('net').connect(3000,'127.0.0.1',()=>{s.destroy();process.exit(0)});s.on('error',()=>process.exit(1))"
exit /b
