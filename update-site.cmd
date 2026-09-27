@echo off
rem Gets the latest version of the Arizon Yadak site from GitHub, then starts it.
rem Double-click this file whenever you are told there is an update.
rem Your data (products, orders, database, uploaded images, .env) is not touched.
chcp 65001 >nul
cd /d "%~dp0"
set "PATH=%ProgramFiles%\Git\cmd;%ProgramFiles%\nodejs;%PATH%"

where git >nul 2>nul || (
  echo Git is not installed on this computer.
  goto :error
)

rem Updating while the site runs can fail (files in use).
node -e "const s=require('net').connect(3000,'127.0.0.1',()=>{s.destroy();process.exit(1)});s.on('error',()=>process.exit(0))" || (
  echo The site is still running. Close its window first, then double-click this file again.
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
call "%~dp0start-local.cmd"
goto :eof

:error
echo.
echo Update did not finish. Take a screenshot of this window and send it.
pause
