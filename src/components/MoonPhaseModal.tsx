import React, { useState, useMemo } from 'react';
import { X, Sparkles, Moon, Info, RefreshCw } from 'lucide-react';

interface MoonPhaseModalProps {
  /** 팝오버 열림 여부 */
  isOpen: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 기준 날짜 (기본: 오늘) */
  currentDate: Date;
}

/**
 * 🌙 달의 주요 8위상 데이터 인터페이스
 */
interface MoonPhaseInfo {
  name: string;
  hanja: string;
  english: string;
  icon: string;
  lunarDay: number;
  phaseNormalized: number; // 0.0 ~ 1.0
  illumination: number; // 0 ~ 100%
  description: string;
  scienceFact: string;
  tideInfo: string; // 물때 (사리/조금)
}

/**
 * 🌙 MoonPhaseModal 컴포넌트
 * - 상단 헤더 캘린더의 음력 달 칩 클릭 시 밝기 변화와 슬라이드 다운 애니메이션으로 나타납니다.
 * - 실제 날짜의 음력 월령에 기반한 실사 달 텍스처와 정밀 수학적 위상 섀도우를 렌더링합니다.
 * - 초등학교 3학년 '지구와 달' 과학 단원에 맞춘 유익한 설명과 상호작용 프리셋을 제공합니다.
 */
export const MoonPhaseModal: React.FC<MoonPhaseModalProps> = ({
  isOpen,
  onClose,
  currentDate,
}) => {
  // 사용자가 프리셋을 눌러 다른 위상을 탐색 중인지 여부 (null이면 오늘 날짜 기준)
  const [selectedPhaseOverride, setSelectedPhaseOverride] = useState<number | null>(null);

  // 📐 1. 실제 날짜 기반 음력 주기 및 위상 계산 (기준: 2000-01-06 신월, 주기 29.53058867일)
  const todayPhaseData = useMemo(() => {
    const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    const synodicMonth = 29.53058867;
    const diffDays = (currentDate.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    const phase = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
    const normalizedPhase = phase / synodicMonth;
    const approxLunarDay = Math.floor(phase) + 1; // 1 ~ 30일
    const illumination = Math.round(((1 - Math.cos(normalizedPhase * 2 * Math.PI)) / 2) * 100);

    let name = '삭';
    let hanja = '朔';
    let english = 'New Moon';
    let icon = '🌑';
    let description = '달이 태양과 지구 사이에 있어 보이지 않는 시기입니다.';
    let scienceFact = '낮에 태양과 함께 뜨고 지기 때문에 밤하늘에서는 볼 수 없어요.';
    let tideInfo = '사리 (조수간만의 차가 가장 큰 시기)';

    if (normalizedPhase < 0.03 || normalizedPhase >= 0.97) {
      name = '삭 (신월)';
      hanja = '朔 (新月)';
      english = 'New Moon';
      icon = '🌑';
      description = '달이 해와 같은 방향에 있어 달의 어두운 면만 지구를 향합니다.';
      scienceFact = '달의 뒷면만 햇빛을 받고 있어서 지구에서는 깜깜하게 보여요!';
      tideInfo = '사리 (밀물과 썰물의 차이가 큼)';
    } else if (normalizedPhase < 0.22) {
      name = '초승달';
      hanja = '初生月';
      english = 'Waxing Crescent';
      icon = '🌒';
      description = '해 질 무렵 서쪽 하늘에 오른쪽 눈썹 모양으로 예쁘게 뜹니다.';
      scienceFact = '태양빛을 오른쪽 가장자리만 비스듬히 받아서 얇은 활 모양으로 보여요.';
      tideInfo = '조금으로 가는 길목 (조류가 점차 완만해짐)';
    } else if (normalizedPhase < 0.28) {
      name = '상현달';
      hanja = '上弦月';
      english = 'First Quarter';
      icon = '🌓';
      description = '오른쪽 반쪽이 밝게 차오른 반달로, 낮에 떠서 자정에 집니다.';
      scienceFact = '활 시위를 위로 당긴 모양이라 하여 ‘상현(上弦)’이라고 불러요.';
      tideInfo = '조금 (밀물과 썰물의 차이가 가장 작음)';
    } else if (normalizedPhase < 0.47) {
      name = '차오르는 달';
      hanja = '上弦望間';
      english = 'Waxing Gibbous';
      icon = '🌔';
      description = '상현달을 지나 보름달을 향해 둥글게 살이 차오르는 달입니다.';
      scienceFact = '달의 대부분이 환하게 햇빛을 받아 밤하늘을 밝게 비춰줘요.';
      tideInfo = '사리로 가는 길목 (조류가 점차 세어짐)';
    } else if (normalizedPhase < 0.53) {
      name = '보름달 (만월)';
      hanja = '滿月 (望)';
      english = 'Full Moon';
      icon = '🌕';
      description = '태양의 반대편에 위치하여 달의 밝은 면 전체가 환하게 보이는 둥근 달입니다.';
      scienceFact = '해-지구-달이 일직선으로 서서 햇빛을 정면으로 가득 받아 가장 밝아요!';
      tideInfo = '사리 (바닷물이 가장 높게 차오르고 가장 멀리 빠져나감)';
    } else if (normalizedPhase < 0.72) {
      name = '기울어가는 달';
      hanja = '下弦望間';
      english = 'Waning Gibbous';
      icon = '🌖';
      description = '보름달을 지나 오른쪽부터 조금씩 어두워지기 시작하는 달입니다.';
      scienceFact = '보름이 지나고 달이 뜨는 시각이 매일 약 50분씩 늦어져요.';
      tideInfo = '조금으로 가는 길목';
    } else if (normalizedPhase < 0.78) {
      name = '하현달';
      hanja = '下弦月';
      english = 'Last Quarter';
      icon = '🌗';
      description = '왼쪽 반쪽만 밝게 빛나는 반달로, 자정에 떠서 정오에 집니다.';
      scienceFact = '활 시위를 아래로 향한 모양이라 하여 ‘하현(下弦)’이라고 불러요.';
      tideInfo = '조금 (밀물과 썰물의 차이가 가장 작음)';
    } else {
      name = '그믐달';
      hanja = '晦月';
      english = 'Waning Crescent';
      icon = '🌘';
      description = '새벽녘 동쪽 하늘에 왼쪽 눈썹 모양으로 뜨는 달입니다.';
      scienceFact = '곧 해가 뜰 무렵 동쪽 지평선 위에서만 잠깐 볼 수 있는 신비로운 달이에요.';
      tideInfo = '사리로 가는 길목 (보름/그믐 사리 준비)';
    }

    return {
      phaseDays: phase,
      normalizedPhase,
      lunarDay: approxLunarDay,
      illumination,
      name,
      hanja,
      english,
      icon,
      description,
      scienceFact,
      tideInfo,
    };
  }, [currentDate]);

  // 🌟 현재 렌더링할 위상 (오버라이드된 프리셋 또는 오늘)
  const activePhaseNormalized = selectedPhaseOverride !== null ? selectedPhaseOverride : todayPhaseData.normalizedPhase;
  const isCustomPreview = selectedPhaseOverride !== null;

  // 활성화된 위상 정보 계산
  const activeInfo = useMemo(() => {
    if (!isCustomPreview) return todayPhaseData;

    const norm = activePhaseNormalized;
    const lunarDay = Math.round(norm * 29.53) + 1;
    const illumination = Math.round(((1 - Math.cos(norm * 2 * Math.PI)) / 2) * 100);

    let name = '삭';
    let hanja = '朔';
    let english = 'New Moon';
    let icon = '🌑';
    let description = '달이 태양과 같은 방향에 있는 신월입니다.';
    let scienceFact = '지구에서 볼 때 달의 어두운 밤 쪽 면만 보입니다.';
    let tideInfo = '사리';

    if (norm < 0.05 || norm >= 0.95) {
      name = '삭 (신월)';
      hanja = '朔';
      english = 'New Moon';
      icon = '🌑';
      description = '달과 해가 겹쳐 보여 밤하늘에서 달을 볼 수 없는 날입니다.';
      scienceFact = '달의 그림자 면만 마주보고 있어요.';
      tideInfo = '사리';
    } else if (norm < 0.22) {
      name = '초승달';
      hanja = '初生月';
      english = 'Waxing Crescent';
      icon = '🌒';
      description = '초저녁 서쪽 하늘에 가늘고 뾰족하게 뜨는 눈썹 모양 달입니다.';
      scienceFact = '오른쪽 테두리만 햇빛을 받아 얇게 반사합니다.';
      tideInfo = '중조';
    } else if (norm < 0.28) {
      name = '상현달';
      hanja = '上弦月';
      english = 'First Quarter';
      icon = '🌓';
      description = '오른쪽 반쪽이 밝게 빛나는 아름다운 반달입니다.';
      scienceFact = '오른쪽 반구가 태양빛을 정면으로 받습니다.';
      tideInfo = '조금';
    } else if (norm < 0.47) {
      name = '차오르는 달';
      hanja = '上弦望間';
      english = 'Waxing Gibbous';
      icon = '🌔';
      description = '상현달보다 살이 더 쪄서 보름달로 다가가는 모습입니다.';
      scienceFact = '달 표면의 75% 이상이 밝게 보입니다.';
      tideInfo = '중조';
    } else if (norm < 0.53) {
      name = '보름달 (만월)';
      hanja = '滿月';
      english = 'Full Moon';
      icon = '🌕';
      description = '둥글고 환하게 차올라 온 세상을 비추는 만월입니다.';
      scienceFact = '지구가 태양과 달 사이에 있어 달 전면이 가득 밝혀집니다.';
      tideInfo = '사리';
    } else if (norm < 0.72) {
      name = '기울어가는 달';
      hanja = '下弦望間';
      english = 'Waning Gibbous';
      icon = '🌖';
      description = '보름달에서 서서히 왼쪽만 남아가는 이지러지는 달입니다.';
      scienceFact = '오른쪽부터 햇빛이 비껴가기 시작합니다.';
      tideInfo = '중조';
    } else if (norm < 0.78) {
      name = '하현달';
      hanja = '下弦月';
      english = 'Last Quarter';
      icon = '🌗';
      description = '왼쪽 반쪽만 밝게 빛나는 반달로 한밤중에 뜹니다.';
      scienceFact = '왼쪽 반구가 태양빛을 받습니다.';
      tideInfo = '조금';
    } else {
      name = '그믐달';
      hanja = '晦月';
      english = 'Waning Crescent';
      icon = '🌘';
      description = '새벽녘 동쪽 하늘에 뜨는 가느다란 왼쪽 눈썹 모양 달입니다.';
      scienceFact = '곧 삭을 앞두고 마지막 빛을 남깁니다.';
      tideInfo = '사리';
    }

    return {
      phaseDays: norm * 29.53,
      normalizedPhase: norm,
      lunarDay,
      illumination,
      name,
      hanja,
      english,
      icon,
      description,
      scienceFact,
      tideInfo,
    };
  }, [activePhaseNormalized, isCustomPreview, todayPhaseData]);

  /**
   * 🎨 2. 수학적 정밀 달 위상 그림자 마스크 생성 (SVG 차광 패스)
   * - radius R = 100
   * - 위상 p (0~1):
   *   - 0.0: 삭 (달 전체 어두움)
   *   - 0.25: 상현달 (오른쪽 반원 밝음, 왼쪽 반원 어두움)
   *   - 0.5: 보름달 (달 전체 밝음)
   *   - 0.75: 하현달 (왼쪽 반원 밝음, 오른쪽 반원 어두움)
   *   - 1.0: 삭
   */
  const shadowSvgPath = useMemo(() => {
    const p = activePhaseNormalized;
    const R = 98; // 달 마스크 반경

    // p === 0 또는 1 (삭): 원 전체가 그림자
    if (p <= 0.01 || p >= 0.99) {
      return `M 100 ${100 - R} A ${R} ${R} 0 1 0 100 ${100 + R} A ${R} ${R} 0 1 0 100 ${100 - R} Z`;
    }
    // p === 0.5 (보름달): 그림자 없음 (빈 패스)
    if (Math.abs(p - 0.5) < 0.015) {
      return '';
    }

    // 경계선(Terminator) 타원의 가로 반경 rx (코사인에 비례)
    const cosAngle = Math.cos(p * 2 * Math.PI);
    const rx = Math.max(0.1, Math.abs(cosAngle) * R);

    if (p < 0.5) {
      // 🌓 초승 ~ 보름 구간: 오른쪽이 빛을 받고, 왼쪽이 어두움
      if (p < 0.25) {
        // 초승달: 왼쪽 반원 전체 어두움 + 오른쪽 일부도 어두움 (타원 포함)
        return `
          M 100 ${100 - R}
          A ${R} ${R} 0 0 0 100 ${100 + R}
          A ${rx} ${R} 0 0 1 100 ${100 - R}
          Z
        `;
      } else {
        // 차오르는 달: 왼쪽 반원 중 일부만 어두움 (타원이 빛을 받아 안쪽으로 들어감)
        return `
          M 100 ${100 - R}
          A ${R} ${R} 0 0 0 100 ${100 + R}
          A ${rx} ${R} 0 0 0 100 ${100 - R}
          Z
        `;
      }
    } else {
      // 🌗 보름 ~ 그믐 구간: 왼쪽이 빛을 받고, 오른쪽이 어두움
      if (p < 0.75) {
        // 기울어가는 달: 오른쪽 반원 중 일부만 어두움
        return `
          M 100 ${100 - R}
          A ${R} ${R} 0 0 1 100 ${100 + R}
          A ${rx} ${R} 0 0 1 100 ${100 - R}
          Z
        `;
      } else {
        // 그믐달: 오른쪽 반원 전체 어두움 + 왼쪽 일부도 어두움
        return `
          M 100 ${100 - R}
          A ${R} ${R} 0 0 1 100 ${100 + R}
          A ${rx} ${R} 0 0 0 100 ${100 - R}
          Z
        `;
      }
    }
  }, [activePhaseNormalized]);

  // 탐색용 빠른 위상 프리셋 리스트
  const PRESET_PHASES = [
    { label: '초승달', phase: 0.12, icon: '🌒' },
    { label: '상현달', phase: 0.25, icon: '🌓' },
    { label: '보름달', phase: 0.50, icon: '🌕' },
    { label: '하현달', phase: 0.75, icon: '🌗' },
    { label: '그믐달', phase: 0.88, icon: '🌘' },
  ];

  return (
    <>
      {/* 🌌 배경 딤 백드롭 (부드러운 블러 + 어두워짐) */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 🚀 슬라이드 다운 + 밝기 변화 애니메이션 팝오버 컨테이너 */}
      <div
        className={`fixed z-50 transition-all duration-300 ease-out transform ${
          isOpen
            ? 'opacity-100 filter brightness-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 filter brightness-50 -translate-y-5 scale-95 pointer-events-none'
        } top-16 sm:top-20 right-3 sm:right-6 md:right-10 w-[94vw] max-w-[390px] rounded-3xl bg-slate-900/90 dark:bg-slate-950/95 border border-amber-300/30 dark:border-amber-400/25 shadow-2xl shadow-amber-500/10 backdrop-blur-2xl text-white overflow-hidden`}
        role="dialog"
        aria-label="달의 위상 상세 보기"
      >
        {/* ✨ 밤하늘 별빛 오로라 헤더 배경 */}
        <div className="relative px-5 pt-4 pb-3 border-b border-white/10 bg-gradient-to-r from-indigo-950/80 via-slate-900/80 to-purple-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-300/30 shadow-inner">
              <Moon className="w-4 h-4 fill-amber-300" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-amber-200 tracking-tight">오늘의 달 위상 탐험</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold">
                  음력 {activeInfo.lunarDay}일경
                </span>
              </div>
              <p className="text-[10.5px] text-slate-300 font-medium">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 {currentDate.getDate()}일 기준
              </p>
            </div>
          </div>

          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white transition-colors"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 🌕 중앙: 실사 달 텍스처 + 정밀 수학적 위상 섀도우 렌더러 */}
        <div className="px-5 py-5 flex flex-col items-center justify-center bg-radial from-slate-800/60 to-transparent relative">
          {/* 은은한 달빛 방출 아우라 글로우 */}
          <div
            className="absolute w-52 h-52 rounded-full pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(circle, rgba(254, 240, 138, ${
                (activeInfo.illumination / 100) * 0.22 + 0.05
              }) 0%, rgba(250, 204, 21, 0.08) 45%, transparent 70%)`,
            }}
          />

          {/* 실제 달 텍스처 원형 프레임 */}
          <div className="relative w-44 h-44 rounded-full shadow-[0_0_35px_rgba(253,224,71,0.25)] border-2 border-white/20 overflow-hidden bg-black select-none shrink-0 group">
            {/* 고해상도 실제 달 사진 텍스처 */}
            <img
              src="/assets/moon_real.jpg"
              alt={`${activeInfo.name} 실제 형상`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* 🌑 수학적 위상 섀도우 오버레이 (빛을 받지 못하는 밤 쪽 면에 자연스러운 지구조와 그림자 생성) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 200 200"
              preserveAspectRatio="none"
            >
              {shadowSvgPath && (
                <path
                  d={shadowSvgPath}
                  fill="rgba(5, 7, 18, 0.88)"
                  className="transition-all duration-500 ease-out"
                  filter="drop-shadow(0 0 3px rgba(0,0,0,0.8))"
                />
              )}
            </svg>

            {/* 달빛 림 라이트 (가장자리 빛 번짐) */}
            <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/30 pointer-events-none" />
          </div>

          {/* 달의 주요 이름 및 위상 태그 배지 */}
          <div className="mt-3.5 text-center flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-xl leading-none">{activeInfo.icon}</span>
              <h4 className="text-lg font-black text-amber-100 tracking-tight">
                {activeInfo.name}
              </h4>
              <span className="text-xs text-amber-300/80 font-bold">({activeInfo.english})</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 max-w-[280px] leading-relaxed">
              {activeInfo.description}
            </p>
          </div>

          {/* 📊 주요 수치 3분할 칩 (조명율 / 월령 / 물때) */}
          <div className="grid grid-cols-3 gap-2 w-full mt-4">
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 font-semibold">밝기(조명율)</span>
              <span className="text-sm font-extrabold text-amber-300 mt-0.5">
                {activeInfo.illumination}%
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 font-semibold">월령(주기)</span>
              <span className="text-sm font-extrabold text-sky-300 mt-0.5">
                {activeInfo.phaseDays.toFixed(1)}일
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 font-semibold">조석(물때)</span>
              <span className="text-xs font-bold text-emerald-300 mt-1 truncate max-w-[80px]">
                {activeInfo.tideInfo.split(' ')[0]}
              </span>
            </div>
          </div>
        </div>

        {/* 🔭 초등 3학년 과학 상식 쏙쏙 카드 */}
        <div className="px-5 py-3 bg-white/5 border-t border-white/10 flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 shrink-0 mt-0.5">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div className="text-[11px] leading-snug">
            <span className="font-bold text-sky-200">초등 과학 팁: </span>
            <span className="text-slate-300">{activeInfo.scienceFact}</span>
          </div>
        </div>

        {/* 🎮 인터랙티브 위상 비교 탐색 바 (초승~보름~그믐) */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-950/70 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              다른 달 모양 관찰하기
            </span>
            {isCustomPreview && (
              <button
                type="button"
                onClick={() => setSelectedPhaseOverride(null)}
                className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-bold active:scale-95 transition-transform"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                오늘 달로 복귀
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-1">
            {PRESET_PHASES.map((preset) => {
              const isSelected = selectedPhaseOverride === preset.phase;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setSelectedPhaseOverride(preset.phase)}
                  className={`flex-1 py-1 px-1 rounded-xl text-center flex flex-col items-center gap-0.5 transition-all text-[9.5px] font-bold border ${
                    isSelected
                      ? 'bg-amber-400/30 border-amber-300 text-amber-200 shadow-xs scale-105'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                  }`}
                  title={`${preset.label} 모양 보기`}
                >
                  <span className="text-xs leading-none">{preset.icon}</span>
                  <span className="leading-none">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default MoonPhaseModal;
