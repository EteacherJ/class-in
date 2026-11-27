import React, { useRef, useState, useEffect } from 'react';

export const MiniWhiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [penColor, setPenColor] = useState<string>('#4f46e5');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);

  // Set up canvas resolution
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = penColor;
  };

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = penColor;
    }
  }, [penColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  return (
    <div className="mt-1 pt-2.5 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPenColor('#4f46e5')}
            className={`w-4 h-4 rounded-full bg-indigo-600 transition cursor-pointer ${
              penColor === '#4f46e5' ? 'ring-2 ring-indigo-400 scale-110' : 'opacity-70 hover:opacity-100'
            }`}
            title="남색 펜"
          />
          <button
            onClick={() => setPenColor('#dc2626')}
            className={`w-4 h-4 rounded-full bg-rose-600 transition cursor-pointer ${
              penColor === '#dc2626' ? 'ring-2 ring-rose-400 scale-110' : 'opacity-70 hover:opacity-100'
            }`}
            title="빨간색 펜"
          />
          <button
            onClick={() => setPenColor('#0f172a')}
            className={`w-4 h-4 rounded-full bg-slate-900 transition cursor-pointer ${
              penColor === '#0f172a' ? 'ring-2 ring-slate-400 scale-110' : 'opacity-70 hover:opacity-100'
            }`}
            title="검은색 펜"
          />
          <button
            onClick={() => setPenColor('#059669')}
            className={`w-4 h-4 rounded-full bg-emerald-600 transition cursor-pointer ${
              penColor === '#059669' ? 'ring-2 ring-emerald-400 scale-110' : 'opacity-70 hover:opacity-100'
            }`}
            title="초록색 펜"
          />
          <span className="text-[10px] text-slate-400 ml-1 font-medium">판서 메모</span>
        </div>
        <button
          onClick={clearCanvas}
          className="text-[10px] text-slate-400 hover:text-rose-600 font-medium cursor-pointer transition"
        >
          전체 지우기
        </button>
      </div>

      <div className="bg-slate-50/90 rounded-xl border border-slate-200 relative h-24 overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block touch-none"
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[11px] text-slate-300 font-medium">
            마우스나 전자펜으로 여기에 판서 메모를 작성하세요
          </div>
        )}
        <div className="absolute bottom-1 right-2 text-[9px] text-slate-300 pointer-events-none">
          전자펜 판서 가능
        </div>
      </div>
    </div>
  );
};
