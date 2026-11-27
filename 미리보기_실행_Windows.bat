@echo off
chcp 65001 >nul
REM ===========================================================
REM  Class in 미리보기 실행 (Windows) - Node.js 가 설치된 PC 에서 사용
REM  설치된 Class in 데이터의 복사본으로 실행하므로 원본은 바뀌지 않습니다.
REM ===========================================================
cd /d "%~dp0"
where node >nul 2>nul || (echo [오류] Node.js 가 없습니다. https://nodejs.org 에서 설치해 주세요. & pause & exit /b 1)
if not exist "node_modules\.bin\vite.cmd" (echo 처음 한 번 준비 중... & call npm install --no-audit --no-fund)
if not exist "node_modules\electron\dist\electron.exe" (call npm install --no-audit --no-fund)
echo 수정한 코드로 화면을 만드는 중...
call npx vite build --logLevel warn || (pause & exit /b 1)
echo 미리보기 창을 엽니다. 설치된 Class in 은 먼저 종료해 주세요.
set CLASSIN_PREVIEW=1
call npx electron .
