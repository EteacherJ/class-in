/**
 * PDF → 글자 조각(TextPiece) 추출 (pdf.js)
 * - 한글 CID 글꼴을 바르게 읽도록 문자 대응표(cMap)를 함께 불러옵니다.
 * - 화면 좌표(위에서부터)로 바꿔 판독기에 넘깁니다.
 */
import type { TextPiece } from './weeklyPlanParser';

type PdfJs = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfJs> | null = null;
async function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const lib = await import('pdfjs-dist');
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    })();
  }
  return pdfjsPromise;
}

export async function extractPdfPages(data: ArrayBuffer, maxPages = 4, lib?: PdfJs, cMapUrl?: string): Promise<TextPiece[][]> {
  const pdfjs = lib || (await loadPdfJs());
  const base = typeof window !== 'undefined' ? new URL('./', window.location.href).toString() : '';
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(data),
    cMapUrl: cMapUrl ?? `${base}pdfjs-cmaps/`,
    cMapPacked: true,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;
  const pages: TextPiece[][] = [];
  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const pieces: TextPiece[] = [];
    for (const it of content.items as any[]) {
      if (!it.str || !it.str.trim()) continue;
      const tx = pdfjs.Util.transform(viewport.transform, it.transform);
      const h = Math.hypot(tx[2], tx[3]) || it.height || 10;
      pieces.push({ str: it.str, x: tx[4], y: tx[5], w: it.width || h * it.str.length * 0.9, h });
    }
    pages.push(pieces);
  }
  await doc.destroy();
  return pages;
}
