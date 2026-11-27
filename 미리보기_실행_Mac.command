#!/bin/bash
# =============================================================================
# 🧪 Class in 미리보기 실행 (맥)
#  - 코드를 수정한 뒤, 설치 파일을 만들기 전에 실제 앱과 똑같이 띄워 확인합니다.
#  - 설치된 Class in 의 데이터 '복사본'으로 실행하므로 원래 데이터는 바뀌지 않습니다.
#  - 처음 한 번은 준비(다운로드)에 몇 분 걸릴 수 있어요.
# =============================================================================
cd "$(dirname "$0")" || exit 1
ELECTRON_VERSION="44.10.2"
CACHE="$HOME/.classin-preview"

echo "🧪 Class in 미리보기를 준비합니다..."

if ! command -v node >/dev/null 2>&1; then
  echo "🔴 Node.js 가 없습니다. https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요."
  read -n 1 -s -r -p "아무 키나 누르면 닫힙니다."; exit 1
fi

if lsof -nP -iTCP:19283 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "🟡 설치된 Class in 앱이 켜져 있어요. 앱을 종료(⌘Q)한 뒤 아무 키나 누르세요."
  read -n 1 -s -r
fi

# 1) 화면 빌드 도구 준비 (프로젝트 폴더)
if [ ! -x "node_modules/.bin/vite" ]; then
  echo "📦 화면 빌드 도구 설치 중 (처음 한 번)..."
  npm install --no-audit --no-fund || { echo "🔴 설치 실패"; read -n 1 -s -r; exit 1; }
fi

# 2) Electron 준비 (구글 드라이브 폴더는 앱 묶음이 깨질 수 있어 맥 로컬 폴더에 설치)
ELECTRON_BIN="$CACHE/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
INSTALLED_VER="$(node -p "try{require('$CACHE/node_modules/electron/package.json').version}catch(e){''}" 2>/dev/null)"
if [ ! -x "$ELECTRON_BIN" ] || [ "$INSTALLED_VER" != "$ELECTRON_VERSION" ]; then
  echo "📦 Electron $ELECTRON_VERSION 준비 중 (처음 한 번, 약 130MB)..."
  mkdir -p "$CACHE"
  npm install --prefix "$CACHE" --no-audit --no-fund "electron@$ELECTRON_VERSION" || { echo "🔴 Electron 설치 실패"; read -n 1 -s -r; exit 1; }
fi

# 3) 최신 코드로 화면 빌드
echo "🔨 수정한 코드로 화면을 만드는 중..."
npx vite build --logLevel warn || { echo "🔴 빌드 오류가 있어요. 위 메시지를 확인해 주세요."; read -n 1 -s -r; exit 1; }

# 4) 미리보기 실행
echo "🚀 미리보기 창을 엽니다. (창 제목: Class in (미리보기))"
CLASSIN_PREVIEW=1 "$ELECTRON_BIN" "$(pwd)"
