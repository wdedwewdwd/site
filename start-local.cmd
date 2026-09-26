@echo off
rem Runs the Arizon Yadak site on this computer (development mode).
rem Double-click this file, wait a few seconds, and the site opens in your browser.
chcp 65001 >nul
cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%PATH%"

if not exist node_modules (
  echo Installing packages, first run only...
  call npm install || goto :error
)

echo Starting the local database...
call npx prisma dev --name arizon --detach >nul || goto :error
call npx prisma migrate deploy >nul || goto :error

echo.
echo  Site: http://localhost:3000
echo  Admin panel: http://localhost:3000/admin  (test number: 09120000000)
echo  Login codes are printed in this window as [dev-sms].
echo  Close this window to stop the site.
echo.

start "" cmd /c "timeout /t 8 >nul & start http://localhost:3000"
call npm run dev
goto :eof

:error
echo.
echo Something went wrong. Take a screenshot of this window and send it.
pause
