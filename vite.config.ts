import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        // 구글 드라이브 클라우드 동기화 환경 파일 읽기 타임아웃(ETIMEDOUT) 및 과도한 I/O 방지
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.DS_Store', '**/release/**'],
      },
    },
  };
});
