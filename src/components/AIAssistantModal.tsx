import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  MessageSquare,
  Heart,
  Lightbulb,
  FileText,
  Calendar,
  Send,
  Download,
} from 'lucide-react';
import { ClassConfig, Team } from '../types';
import { samplePdfWeekDetails } from '../data/initialData';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ClassConfig;
  teams: Team[];
  onAddAgenda?: (text: string) => void;
  onShowToast: (msg: string) => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  config,
  teams,
  onAddAgenda,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'icebreaker' | 'notice' | 'praise'>('weekly');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Weekly Analysis State (요구사항 13: 주간학습안내 분석 후 알림장 생성 기능)
  const [selectedDay, setSelectedDay] = useState<string>('월');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [generatedNotice, setGeneratedNotice] = useState<string>('');

  if (!isOpen) return null;

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onShowToast('📋 문구가 클립보드에 복사되었습니다!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Run Weekly Plan AI Analysis
  const handleAnalyzeWeeklyPlan = (dayKey: string) => {
    setIsAnalyzing(true);
    const dayData = samplePdfWeekDetails.days.find((d) => d.day === dayKey) || samplePdfWeekDetails.days[0];

    setTimeout(() => {
      setIsAnalyzing(false);
      const subjectsStr = dayData.periods.map((p) => `${p.subject}(${p.topic})`).join(', ');
      const text = `[${config.schoolName} ${config.grade}학년 ${config.classNum}반 ${dayData.date}(${dayData.day}) 알림장]
1. 오늘 배운 내용: ${subjectsStr}
2. 내일 수업 준비물:
   - 교과서 및 배움공책, 필기도구 챙기기
   - 체육: 편안한 복장 및 운동화 착용
   - 미술/음악: 색연필 및 개인 악기
3. 가정 연계 및 안전 지도:
   - ${samplePdfWeekDetails.guidance[0]}
   - ${samplePdfWeekDetails.guidance[1]}
4. 온작품 읽기 안내:
   - "${samplePdfWeekDetails.readingBook}" 매일 20분씩 가정에서 바르게 읽기`;

      setGeneratedNotice(text);
      onShowToast(`✨ 9월 주간학습안내 기반 [${dayKey}요일 알림장]이 생성되었습니다.`);
    }, 700);
  };

  const handleRegisterToAgenda = () => {
    if (!generatedNotice) return;
    if (onAddAgenda) {
      onAddAgenda(generatedNotice.split('\n')[0]);
      onShowToast('📋 학급 알림장 위젯에 요약 항목이 자동 등록되었습니다.');
    }
  };

  const sampleNotices = [
    {
      id: 'n1',
      title: '📅 3월 25일(수) 일일 알림장',
      content: `[${config.schoolName} ${config.grade}학년 ${config.classNum}반 알림장]\n1. 국어 1단원 활동지 배부 및 모둠 협동 학습 마무리\n2. 내일 미술 준비물: 12색 수채화 물감, 파레트, 붓 챙겨오기\n3. 방과후 오케스트라 희망 신청서 이번 주 금요일까지 제출 바랍니다.\n4. 일교차가 큽니다. 겉옷을 챙겨 감기에 유의해 주세요.`,
    },
    {
      id: 'n2',
      title: '🎒 준비물 & 주간 안전 안내',
      content: `[안전 및 준비물 알림]\n- 내일 체육 수업이 있습니다. 편안한 운동화와 체육복을 착용해 주세요.\n- 복도 및 계단에서는 뛰지 않고 우측통행을 실천합니다.`,
    },
  ];

  const icebreakers = [
    {
      id: 'i1',
      title: '🎯 3분 집중 릴레이: 모둠 한 글자 이어말하기',
      desc: '선생님이 제시한 주제 단어로 모둠원 4명이 돌아가며 한 글자씩 낱말을 완성하는 초스피드 집중 놀이입니다.',
    },
    {
      id: 'i2',
      title: '🤝 침묵의 줄서기 (비언어적 협동 게임)',
      desc: '말을 하지 않고 오직 손짓과 표정으로만 생일 빠른 순서대로 모둠별 일렬로 정렬하는 협동 집중 게임입니다.',
    },
    {
      id: 'i3',
      title: '💡 1분 브레인스토밍: 포스트잇 릴레이',
      desc: '모둠별로 오늘의 수업 주제와 관련된 단어를 1분 동안 가장 많이 작성해 칠판 모둠 칸에 부착하는 활력 증진 활동입니다.',
    },
  ];

  const praises = teams.map((t) => ({
    id: `p-${t.id}`,
    title: `${t.name} 협력 칭찬 카드`,
    content: `"${t.name} 친구들은 오늘 수업 시간 동안 서로의 의견을 경청하고 양보하며 아름다운 배려를 보여주었습니다. 멋진 팀워크를 발휘하고 있습니다!"`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 md:p-6 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">스마트 AI 학급 보조교사</h3>
                <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                  주간학습안내 OCR 연동
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">
                주간학습안내지 분석, 맞춤 알림장 생성, 수업 집중 활동, 칭찬 문구를 원클릭으로 지원합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-1 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'weekly'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>주간학습안내 분석 알림장 (9월 7~11일)</span>
          </button>
          <button
            onClick={() => setActiveTab('notice')}
            className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'notice'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>일일 알림장 템플릿</span>
          </button>
          <button
            onClick={() => setActiveTab('icebreaker')}
            className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'icebreaker'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>수업 집중 숏컷 놀이</span>
          </button>
          <button
            onClick={() => setActiveTab('praise')}
            className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'praise'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>모둠 칭찬 카드</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scroll space-y-4 flex-1">
          {/* TAB: Weekly Plan AI Analysis (요구사항 13) */}
          {activeTab === 'weekly' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-extrabold text-indigo-950 text-sm">
                      📄 {samplePdfWeekDetails.title} 분석 엔진
                    </span>
                    <p className="text-indigo-800 text-[11px] mt-0.5">
                      온작품 읽기 도서: <span className="font-bold">"{samplePdfWeekDetails.readingBook}"</span> / 학사일정 및 주간 안전 지도 연동
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {['월', '화', '수', '목', '금'].map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setSelectedDay(d);
                          handleAnalyzeWeeklyPlan(d);
                        }}
                        className={`w-8 h-8 rounded-xl font-bold transition cursor-pointer ${
                          selectedDay === d
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-indigo-200 hover:bg-slate-100'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-indigo-200/60">
                  <span className="text-indigo-900 font-bold">
                    현재 선택: 9월 {selectedDay === '월' ? '7일(월)' : selectedDay === '화' ? '8일(화)' : selectedDay === '수' ? '9일(수)' : selectedDay === '목' ? '10일(목)' : '11일(금)'}
                  </span>
                  <button
                    onClick={() => handleAnalyzeWeeklyPlan(selectedDay)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAnalyzing ? 'AI 분석 중...' : '알림장 즉시 생성'}</span>
                  </button>
                </div>
              </div>

              {/* Generated Result Box */}
              {generatedNotice && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 animate-fade-in shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>AI 자동 생성 알림장 문구</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyText('weekly-notice', generatedNotice)}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'weekly-notice' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'weekly-notice' ? '복사 완료' : '전체 복사'}</span>
                      </button>
                      <button
                        onClick={handleRegisterToAgenda}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>학급 알림장 위젯에 등록</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-3 bg-slate-950/80 rounded-xl text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed border border-slate-800">
                    {generatedNotice}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB: Standard Notices */}
          {activeTab === 'notice' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 mb-1">
                학부모님 소통 채널(하이클래스, e알리미 등)에 바로 복사해 붙여넣을 수 있습니다:
              </div>
              {sampleNotices.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-xs text-slate-900">{item.title}</span>
                    <button
                      onClick={() => copyText(item.id, item.content)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedKey === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === item.id ? '복사됨' : '복사하기'}</span>
                    </button>
                  </div>
                  <pre className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                    {item.content}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* TAB: Icebreakers */}
          {activeTab === 'icebreaker' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 mb-1">
                아이들의 집중력이 흐트러지거나 수업 전환 시 활용하기 좋은 2~3분 숏컷 활동입니다:
              </div>
              {icebreakers.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h5 className="font-extrabold text-xs text-indigo-950 mb-1">{item.title}</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* TAB: Praise Cards */}
          {activeTab === 'praise' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 mb-1">
                수업 및 종례 시간에 모둠별로 화면에 띄워 칭찬해 줄 수 있는 격려 문구입니다:
              </div>
              {praises.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-purple-950">{item.title}</span>
                    <button
                      onClick={() => copyText(item.id, item.content)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedKey === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === item.id ? '복사됨' : '복사하기'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 italic leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
