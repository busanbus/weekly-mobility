@echo off
setlocal
cd /d "%~dp0"

title Press Hub - Cloudflare Tunnel

echo.
echo  ===========================================
echo    Press Hub - Cloudflare Tunnel
echo  ===========================================
echo.
echo  This window exposes your local Press Hub through Cloudflare Tunnel.
echo  Make sure server\start.bat is already running in another window.
echo.

REM cloudflared 설치 확인
where cloudflared >nul 2>&1
if errorlevel 1 (
  echo [X] cloudflared is not installed.
  echo.
  echo  Install option 1 ^(recommended^): winget
  echo    winget install --id Cloudflare.cloudflared
  echo.
  echo  Install option 2: direct download
  echo    https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  echo.
  echo  After installing, run this file again.
  echo.
  pause
  exit /b 1
)

echo [1/2] Checking local backend...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:8000/api/health -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"

if errorlevel 1 (
  echo [X] Cannot connect to http://localhost:8000/api/health
  echo.
  echo  Please run server\start.bat first.
  echo  Confirm http://localhost:8000/press-hub.html opens in your browser, then retry.
  echo.
  pause
  exit /b 1
)

echo [2/2] Starting tunnel...
echo.
echo  Copy the https://...trycloudflare.com URL shown below.
echo  Open that URL from another PC or mobile device.
echo.
echo  To stop: press Ctrl+C or close this window.
echo.

cloudflared tunnel --url http://localhost:8000

endlocal
pause
