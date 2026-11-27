import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Youtube, Calendar as CalendarIcon } from 'lucide-react';
import { YouTubeMiniPlayer } from './YouTubeMiniPlayer';
import { SimpleCalendarWidget } from './SimpleCalendarWidget';

interface StackTopCarouselProps {
  videoId: string | null;
  videoTitle?: string;
  isPlaying?: boolean;
  isMuted?: boolean;
  onTogglePlay?: () => void;
  onPlayNext?: () => void;
  onToggleMute?: () => void;
  onExpandYouTube: () => void;
  onCloseYouTube: () => void;
  onOpenYouTubeModal?: () => void;
  onShowToast?: (message: string) => void;
}

/**
 * ============================================================================
 * 🎡 [StackTopCarousel] 스택 상단 슬롯 공유 캐러셀
 * ============================================================================
 * 1. 유튜브 미니 플레이어와 단순 캘린더가 동일한 상단 슬롯을 50:50 분할로 공유합니다.
 * 2. [ < ] [ > ] 버튼 및 키보드 좌/우 방향키(ArrowLeft/ArrowRight)로 매끄러운 슬라이드 전환을 지원합니다.
 * 3. 🚨 [치명적 오디오 중복 버그 완벽 차단 & 무중단 연속 재생]:
 *    - 스택 상단 슬롯의 YouTubeMiniPlayer는 정적 썸네일과 미니 컨트롤 바로 구성되어 실제 iframe을 중복 생성하지 않습니다.
 *    - 재생 중인 사운드는 전역 싱글톤 플레이어에서 끊김 없이 흘러나오며,
 *    - [다음] 버튼을 누르면 플레이리스트 다음 곡으로 즉시 전환됩니다!
 */
export const StackTopCarousel: React.FC<StackTopCarouselProps> = ({
  videoId,
  videoTitle,
  isPlaying = true,
  isMuted,
  onTogglePlay,
  onPlayNext,
  onToggleMute,
  onExpandYouTube,
  onCloseYouTube,
  onOpenYouTubeModal,
  onShowToast,
}) => {
  // 0: 유튜브, 1: 단순 캘린더
  // 만약 videoId가 없으면 기본으로 캘린더(1)를 보여줌
  const [slideIndex, setSlideIndex] = useState<number>(() => (videoId ? 0 : 1));

  // videoId가 새로 들어왔을 때 자동으로 유튜브 탭으로 슬라이드 이동
  useEffect(() => {
    if (videoId) {
      setSlideIndex(0);
    }
  }, [videoId]);

  const goToSlide = (idx: number) => {
    setSlideIndex(idx);
  };

  const handlePrev = () => {
    setSlideIndex((prev) => (prev === 0 ? 1 : 0));
  };

  const handleNext = () => {
    setSlideIndex((prev) => (prev === 1 ? 0 : 1));
  };

  // 키보드 좌/우 방향키 리스너 (input/textarea 입력 중이 아닐 때만 동작)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        setSlideIndex(0);
      } else if (e.key === 'ArrowRight') {
        setSlideIndex(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full shrink-0 flex flex-col gap-1 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-md p-1.5 transition-all overflow-hidden select-none">
      {/* 1. 상단 슬롯 헤더: 깔끔한 미니멀 인디케이터 */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-white/40 dark:border-slate-800/80">
        {/* 현재 슬라이드 상태 라벨 */}
        <div className="flex items-center gap-1.5 min-w-0">
          {slideIndex === 0 ? (
            <>
              <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate">
                유튜브 플레이어
              </span>
              {videoId && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
            </>
          ) : (
            <>
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate">
                학급 월간 달력
              </span>
            </>
          )}
        </div>

        {/* 미니멀 인디케이터 및 좌우 이동 컨트롤러 */}
        <div className="flex items-center gap-1 bg-white/70 dark:bg-slate-800/70 rounded-full px-1.5 py-0.5 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
          <button
            type="button"
            onClick={handlePrev}
            className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition active:scale-90 cursor-pointer"
            title="이전 (유튜브)"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>

          {/* 클릭 가능한 도트 인디케이터 */}
          <div className="flex items-center gap-1.5 px-1">
            <button
              type="button"
              onClick={() => goToSlide(0)}
              className={`rounded-full transition-all cursor-pointer ${
                slideIndex === 0
                  ? 'w-2.5 h-1.5 bg-red-500 rounded-full'
                  : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
              }`}
              title="유튜브 화면으로 이동"
            />
            <button
              type="button"
              onClick={() => goToSlide(1)}
              className={`rounded-full transition-all cursor-pointer ${
                slideIndex === 1
                  ? 'w-2.5 h-1.5 bg-indigo-600 rounded-full'
                  : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
              }`}
              title="캘린더 화면으로 이동"
            />
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition active:scale-90 cursor-pointer"
            title="다음 (캘린더)"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. 캐러셀 슬라이드 트랙 (w-[200%] 2칸 가로 배치 및 translateX 전환) */}
      <div className="w-full overflow-hidden rounded-xl relative">
        <div
          className="flex w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            transform: `translateX(-${slideIndex * 50}%)`,
          }}
        >
          {/* SLIDE 0: 유튜브 미니 플레이어 (경량 뷰 카드 & 오디오 중복 원천 차단) */}
          <div
            className={`w-1/2 shrink-0 pr-1 transition-opacity duration-300 ${
              slideIndex === 0 ? 'opacity-100' : 'opacity-70 pointer-events-none'
            }`}
          >
            {videoId ? (
              <YouTubeMiniPlayer
                videoId={videoId}
                videoTitle={videoTitle}
                isPlaying={isPlaying}
                isMuted={isMuted}
                onTogglePlay={onTogglePlay}
                onPlayNext={onPlayNext}
                onToggleMute={onToggleMute}
                onExpand={onExpandYouTube}
                onClose={onCloseYouTube}
                onShowToast={onShowToast}
              />
            ) : (
              <div className="w-full aspect-video rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-4 text-center gap-2">
                <Youtube className="w-8 h-8 text-red-500 opacity-60 animate-bounce" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  재생 중인 유튜브 영상이 없습니다
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                  유튜브 위젯에서 영상을 틀면 미니 플레이어가 뜹니다.
                </div>
                {onOpenYouTubeModal && (
                  <button
                    type="button"
                    onClick={onOpenYouTubeModal}
                    className="mt-1 px-3 py-1 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-black transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    유튜브 열기
                  </button>
                )}
              </div>
            )}
          </div>

          {/* SLIDE 1: 단순 학급 월간 캘린더 */}
          <div
            className={`w-1/2 shrink-0 pl-1 transition-opacity duration-300 ${
              slideIndex === 1 ? 'opacity-100' : 'opacity-70 pointer-events-none'
            }`}
          >
            <SimpleCalendarWidget onShowToast={onShowToast} />
          </div>
        </div>
      </div>
    </div>
  );
};
