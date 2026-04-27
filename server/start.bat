@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

title 보도자료 허브 백엔드

echo.
echo  ===========================================
echo    보도자료 허브 (Press Hub) - 로컬 서버
echo  ===========================================
echo.

REM ---------- Python 확인 ----------
python --version >nul 2>&1
if errorlevel 1 (
  echo [X] Python 이 설치되어 있지 않습니다.
  echo     https://www.python.org/downloads/  에서 설치 후 다시 실행해 주세요.
  echo.
  pause
  exit /b 1
)

REM ---------- 가상환경 (.venv) ----------
if not exist ".venv\Scripts\activate.bat" (
  echo [1/3] 가상환경 .venv 생성 중...
  python -m venv .venv
  if errorlevel 1 (
    echo [X] 가상환경 생성 실패.
    pause
    exit /b 1
  )
  call .venv\Scripts\activate.bat
  echo [2/3] 의존성 설치 중... (최초 1회만, 1~2분 소요)
  python -m pip install --upgrade pip --quiet
  python -m pip install -r requirements.txt
  if errorlevel 1 (
    echo [X] 의존성 설치 실패.
    pause
    exit /b 1
  )
) else (
  call .venv\Scripts\activate.bat
  echo [1/3] 가상환경 활성화 완료
  echo [2/3] 의존성 검사 중...
  python -m pip install -r requirements.txt --quiet --disable-pip-version-check
)

echo [3/3] 서버 시작 중...
echo.
echo  ┌────────────────────────────────────────────────────┐
echo  │  접속 주소: http://localhost:8000/press-hub.html   │
echo  │  종료 방법: Ctrl + C  또는  창 닫기                │
echo  └────────────────────────────────────────────────────┘
echo.

REM 2초 뒤 브라우저 자동 오픈
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000/press-hub.html"

python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload --reload-dir . --reload-include "*.py"

endlocal
pause
