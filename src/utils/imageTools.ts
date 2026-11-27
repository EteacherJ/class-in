/**
 * 이미지 파일을 알맞은 크기로 줄여 data URL 로 변환 (투명 배경 유지: WebP)
 * - 큰 사진을 그대로 저장하면 저장 공간을 많이 차지하고 화면이 느려질 수 있어 긴 변 기준으로 줄입니다.
 */
export async function loadImageFile(file: File, maxSide = 1920, quality = 0.88): Promise<{ dataUrl: string; width: number; height: number }> {
  const src = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('이미지를 읽을 수 없어요'));
    i.src = src;
  });
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  // GIF(움직이는 이미지)와 이미 작은 이미지는 원본 유지
  if (file.type === 'image/gif' || (scale === 1 && file.size < 600_000)) {
    return { dataUrl: src, width: w, height: h };
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: src, width: w, height: h };
  ctx.drawImage(img, 0, 0, w, h);
  let out = canvas.toDataURL('image/webp', quality);
  if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/png');
  return { dataUrl: out, width: w, height: h };
}
