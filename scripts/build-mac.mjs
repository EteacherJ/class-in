// scripts/build-mac.mjs
// macOS Electron 번들 크래시(errno=20 - Not a directory)를 완벽히 해결하는 빌드 스크립트
// 원인: 구글 드라이브(Google Drive File Stream) 파일시스템 상에서 .app 심볼릭링크가 0바이트 파일로 깨지는 현상
// 해결: macOS 로컬 APFS 임시 디렉터리(/tmp/ttime-mac-build)에서 빌드 후 DMG 및 ZIP을 release 폴더로 복사

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const tempBuildDir = '/tmp/ttime-mac-build';
const releaseDir = path.resolve(projectRoot, 'release');

console.log('🔵 [1/6] 프로젝트 환경 점검 및 이전 macOS 빌드 캐시 클린업...');

// 1. 이전 release 폴더 내 깨진 mac 산출물 정리
try {
  if (fs.existsSync(releaseDir)) {
    const files = fs.readdirSync(releaseDir);
    for (const f of files) {
      if (f.startsWith('mac-arm64') || f.endsWith('.dmg') || f.endsWith('.zip') || f.endsWith('.pkg')) {
        const fullPath = path.join(releaseDir, f);
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`🟡 기존 mac 산출물 삭제: ${f}`);
      }
    }
  } else {
    fs.mkdirSync(releaseDir, { recursive: true });
  }
} catch (e) {
  console.warn('⚠️ 캐시 클린 중 경고 (무시 가능):', e.message);
}

// 2. APFS 임시 빌드 디렉터리 초기화
if (fs.existsSync(tempBuildDir)) {
  fs.rmSync(tempBuildDir, { recursive: true, force: true });
}
fs.mkdirSync(tempBuildDir, { recursive: true });
console.log(`🟢 [2/6] macOS 로컬 APFS 임시 빌드 디렉터리 준비 완료: ${tempBuildDir}`);

// 3. Vite 프론트엔드 빌드 실행
console.log('🔵 [3/6] Vite 프로덕션 번들 빌드 시작 (npm run build)...');
execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
console.log('🟢 Vite 빌드 완료!');

// 4. electron-builder 실행 (output을 /tmp 로 지정하여 symlink 보존)
console.log('🔵 [4/6] electron-builder macOS 패키징 시작 (APFS 네이티브 디렉터리 사용)...');
const builderCmd = `npx electron-builder --mac --arm64 --config.directories.output="${tempBuildDir}"`;
execSync(builderCmd, { cwd: projectRoot, stdio: 'inherit' });

// 5. Electron Framework 심볼릭 링크 정상 여부 검증
console.log('🔵 [5/6] 번들 내부 Electron Framework 구조 무결성 검증...');
const appPath = path.join(tempBuildDir, 'mac-arm64', 'Class in.app');
const frameworkPath = path.join(appPath, 'Contents', 'Frameworks', 'Electron Framework.framework');

if (fs.existsSync(frameworkPath)) {
  const stat = fs.lstatSync(frameworkPath);
  if (stat.isDirectory() || stat.isSymbolicLink()) {
    console.log('🟢 [검증 성공] Electron Framework가 정상 디렉터리/심볼릭링크로 보존되었습니다!');
  } else {
    console.error('🔴 [검증 실패] Electron Framework가 일반 파일로 변질되었습니다.');
    process.exit(1);
  }
}

// 6. 완성된 DMG / ZIP 산출물을 프로젝트 release 디렉터리로 복사
console.log(`🔵 [6/6] 완성된 macOS 설치 파일(.dmg, .zip)을 ${releaseDir} 로 이전...`);
const tempFiles = fs.readdirSync(tempBuildDir);
let copiedCount = 0;

for (const file of tempFiles) {
  if (file.endsWith('.dmg') || file.endsWith('.zip') || file.endsWith('.blockmap') || file.endsWith('.yml')) {
    const src = path.join(tempBuildDir, file);
    const dest = path.join(releaseDir, file);
    fs.copyFileSync(src, dest);
    console.log(`  ✓ 복사 완료: ${file}`);
    copiedCount++;
  }
}

// 임시 디렉터리 청소
try {
  fs.rmSync(tempBuildDir, { recursive: true, force: true });
} catch {}

console.log('\n======================================================');
console.log(`🎉 🟢 macOS 설치 패키지(${copiedCount}개 파일) 빌드가 성공적으로 완료되었습니다!`);
console.log(`📂 결과물 위치: ${releaseDir}`);
console.log('💡 [macOS 보안/Quarantine 격리 해제 안내]');
console.log('   개발자 미서명으로 인해 실행이 차단되는 경우 터미널에서 아래 명령을 실행하세요:');
console.log('   👉 xattr -cr "/Applications/Class in.app"');
console.log('======================================================\n');
