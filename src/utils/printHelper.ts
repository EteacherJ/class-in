/**
 * 🖨️ A4 가로(Landscape) 및 세로(Portrait) 무결점 1페이지 인쇄 전용 헬퍼
 * - 부모의 overflow:hidden, transform, modal max-height에 영향받지 않도록
 *   오프스크린 독립 iframe을 생성하여 지정된 영역만 정확하고 깨끗하게 출력합니다.
 * - 크롬 브라우저의 visibility:hidden iframe 인쇄 백지 버그를 원천 차단합니다.
 * - 1페이지 초과 방지(Single Page Guarantee) 룰이 기본 적용됩니다.
 */

export interface PrintOptions {
  title?: string;
  orientation?: 'landscape' | 'portrait';
  margin?: string;
  bodyClass?: string;
  customCss?: string;
}

export function printElementById(elementId: string, options: PrintOptions = {}) {
  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    console.error(`🔴 [printHelper] 인쇄할 요소를 찾을 수 없습니다: #${elementId}`);
    window.print();
    return;
  }

  const {
    title = '학급 대시보드 인쇄',
    orientation = 'portrait',
    margin = '5mm',
    bodyClass = '',
    customCss = '',
  } = options;

  // 1. 기존 임시 iframe 제거
  const existingIframe = document.getElementById('dashboard-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // 2. 가시 렌더링 오프스크린 iframe 생성 (크롬 백지 버그 방지)
  // visibility: hidden이나 0x0 크기 대신 화면 밖 오프스크린에 실제 픽셀 크기로 띄워
  // 브라우저 렌더링 엔진이 그래픽 레이어를 정상 구성하도록 보장합니다.
  const iframe = document.createElement('iframe');
  iframe.id = 'dashboard-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = orientation === 'landscape' ? '297mm' : '210mm';
  iframe.style.height = orientation === 'landscape' ? '210mm' : '297mm';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error('🔴 [printHelper] iframe 문서 생성 실패');
    window.print();
    return;
  }

  // 3. 현재 메인 문서의 모든 CSS 스타일시트 수집
  let stylesHtml = '';
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  // 4. 인쇄용 완벽 독립 HTML 문서 작성
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${stylesHtml}
        <style>
          /* 🖨️ 인쇄 전용 페이지 및 1페이지 초과 방지 기본 룰 */
          @page {
            size: A4 ${orientation};
            margin: ${margin} !important;
          }

          /* 메인 사이트의 body * { visibility: hidden } 룰 완전 무력화 */
          *, *::before, *::after {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", sans-serif !important;
          }

          /* 1페이지 단일 출력 강제 (다음 페이지 분할 방지) */
          #print-root {
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .no-print, button, input[type="button"], input[type="submit"], .modal-backdrop {
            display: none !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          tr, td, th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          ${customCss}
        </style>
      </head>
      <body class="${bodyClass}">
        <div id="print-root">
          ${targetElement.outerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // 5. 스타일 및 리소스 렌더링 대기 후 안정적으로 인쇄 대화상자 호출
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('🔴 [printHelper] 인쇄 실행 중 오류 발생:', e);
      window.print();
    } finally {
      // 인쇄 완료 또는 취소 후 안전하게 iframe 정리
      setTimeout(() => {
        iframe.remove();
      }, 5000);
    }
  }, 450);
}
