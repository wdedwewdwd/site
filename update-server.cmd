@echo off
rem Puts the latest version from GitHub (main) on the live server (ParsPack, 45.149.77.216).
rem Double-click this file after a change is merged on GitHub. Takes about 3 minutes.
rem The site keeps running during the update and switches over only if the new version builds.
rem Works only on this laptop: it signs in with the key in %USERPROFILE%\.ssh\arizon_server.
chcp 65001 >nul

if not exist "%USERPROFILE%\.ssh\arizon_server" (
  echo The server key was not found on this computer.
  goto :error
)

echo Updating the live site...
ssh -i "%USERPROFILE%\.ssh\arizon_server" -o IdentitiesOnly=yes root@45.149.77.216 arizon-deploy || goto :error

echo.
echo Done. The live site is up to date.
pause
exit /b

:error
echo.
echo Update did not finish. Take a screenshot of this window and send it.
pause
exit /b 1
