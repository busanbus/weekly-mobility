@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

title 보도자료 허브 - 내부망 개발 서버

echo.
echo  ===========================================
echo    보도자료 허브 - 내부망 개발 서버
echo  ===========================================
echo.
echo  이 서버는 같은 내부망/LAN의 다른 PC에서 접속할 수 있도록
echo  0.0.0.0:8001 로 실행됩니다.
echo.

REM ---------- Python 확인 ----------
python --version >nul 2>&1
if errorlevel 1 (
  echo [X] Python 이 설치되어 있지 않습니다.
  echo     https://www.python.org/downloads/ 에서 설치 후 다시 실행해 주세요.
  echo.
  pause
  exit /b 1
)

REM ---------- 가상환경 (.venv) ----------
if not exist ".venv\Scripts\activate.bat" (
  echo [1/4] 가상환경 .venv 생성 중...
  python -m venv .venv
  if errorlevel 1 (
    echo [X] 가상환경 생성 실패.
    pause
    exit /b 1
  )
)

call .venv\Scripts\activate.bat

echo [2/4] 의존성 확인 중...
python -m pip install -r requirements.txt --quiet --disable-pip-version-check
if errorlevel 1 (
  echo [X] 의존성 설치 실패.
  pause
  exit /b 1
)

echo [3/4] 이 PC의 내부망 IP 확인:
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | ForEach-Object { Write-Host ('  http://' + $_.IPAddress + ':8001/press-hub.html') }"

echo.
echo  위 주소 중 현재 네트워크에 해당하는 주소를
echo  같은 사내망/와이파이에 있는 다른 PC에서 열면 됩니다.
echo.
echo  만약 접속이 안 되면 Windows Defender 방화벽에서
echo  Python 또는 8001 포트 허용이 필요할 수 있습니다.
echo.
echo [4/4] 서버 시작 중...
echo  종료 방법: Ctrl + C 또는 창 닫기
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload --reload-dir . --reload-include "*.py"

endlocal
pause
