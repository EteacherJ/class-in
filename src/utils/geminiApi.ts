/**
 * ============================================================================
 * [geminiApi.ts] BYOK(Bring Your Own Key) 기반 Google Gemini API 연동 모듈 (2026 최신화)
 * ============================================================================
 * [보안 원칙]:
 * 배포 빌드 번들에 개발자의 API 키가 절대 번들링되거나 노출되지 않습니다.
 * 사용자가 Google AI Studio에서 무료로 발급받은 본인만의 Gemini API 키를 직접 입력하여
 * 로컬에만 보관(localStorage)하고, 클라이언트 측에서 직접 Google API로 안전하게 통신합니다.
 *
 * [2026 구글 Gemini 공식 모델 라인업 대응]:
 * Google의 2026년 모델 정책에 따라 지원 중단된 구형(1.5, 2.0) 대신,
 * 현재 공식 서비스 중인 gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.5-pro 등을 지원하며,
 * 구글 ModelService.ListModels API를 실시간 조회하여 사용자 계정에 할당된 최적 모델을 100% 자동 채택합니다.
 */

export const GEMINI_API_STORAGE_KEY = 'class_dashboard_gemini_api_key';
export const GEMINI_MODEL_STORAGE_KEY = 'class_dashboard_gemini_model_id';
export const GEMINI_VERSION_STORAGE_KEY = 'class_dashboard_gemini_api_version';

export interface ModelCandidate {
  apiVersion: 'v1beta' | 'v1';
  modelId: string;
}

/**
 * 2026년 Google Gemini 공식 활성 모델 우선순위 목록
 */
export const DEFAULT_FALLBACK_CANDIDATES: ModelCandidate[] = [
  { apiVersion: 'v1beta', modelId: 'gemini-2.5-flash' },
  { apiVersion: 'v1beta', modelId: 'gemini-2.5-flash-lite' },
  { apiVersion: 'v1', modelId: 'gemini-2.5-flash' },
  { apiVersion: 'v1beta', modelId: 'gemini-2.5-pro' },
  { apiVersion: 'v1beta', modelId: 'gemini-flash' },
  { apiVersion: 'v1beta', modelId: 'gemini-2.0-flash' },
  { apiVersion: 'v1', modelId: 'gemini-2.0-flash' },
  { apiVersion: 'v1beta', modelId: 'gemini-1.5-flash' },
];

// 🔐 데스크톱 앱(Electron)에서는 OS 보안 저장소(맥 키체인 / 윈도우 DPAPI)에 암호화 보관합니다.
const SECURE_STORE_GEMINI_KEY = 'gemini_api_key';
const LEGACY_LOCAL_KEYS = [GEMINI_API_STORAGE_KEY, 'global_api_key', 'gemini_api_key'];

type SecureStoreApi = {
  isAvailable: () => boolean;
  get: (key: string) => string;
  set: (key: string, value: string) => boolean;
  remove: (key: string) => boolean;
};

function getSecureStore(): SecureStoreApi | null {
  try {
    const store = (window as any)?.electronAPI?.secureStore as SecureStoreApi | undefined;
    return store && store.isAvailable() ? store : null;
  } catch {
    return null;
  }
}

function readLegacyLocalKey(): string {
  for (const k of LEGACY_LOCAL_KEYS) {
    const v = localStorage.getItem(k);
    if (v && v.trim()) return v.trim();
  }
  return '';
}

function clearLegacyLocalKeys() {
  LEGACY_LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
}

/**
 * 보관된 사용자의 Gemini API 키를 가져옵니다.
 * - 데스크톱 앱: OS 보안 저장소 (기존 localStorage 평문 키는 최초 1회 자동 이전 후 삭제)
 * - 웹 브라우저: localStorage
 */
export function getStoredGeminiApiKey(): string {
  try {
    const secure = getSecureStore();
    if (secure) {
      const legacy = readLegacyLocalKey();
      if (legacy) {
        // 평문 키 → 보안 저장소로 이전
        if (secure.set(SECURE_STORE_GEMINI_KEY, legacy)) {
          clearLegacyLocalKeys();
          console.log('🟢 [GeminiAPI] API 키를 OS 보안 저장소로 이전했습니다.');
        }
        return legacy;
      }
      return (secure.get(SECURE_STORE_GEMINI_KEY) || '').trim();
    }
    return readLegacyLocalKey();
  } catch {
    return '';
  }
}

/**
 * 사용자의 Gemini API 키를 저장합니다 (빈 값이면 삭제).
 */
export function setStoredGeminiApiKey(apiKey: string) {
  try {
    const trimmed = (apiKey || '').trim();
    const secure = getSecureStore();
    if (!trimmed) {
      clearLegacyLocalKeys();
      secure?.remove(SECURE_STORE_GEMINI_KEY);
      localStorage.removeItem(GEMINI_MODEL_STORAGE_KEY);
      localStorage.removeItem(GEMINI_VERSION_STORAGE_KEY);
      console.log('🔵 [GeminiAPI] API 키 및 모델 정보 초기화');
      return;
    }
    if (secure && secure.set(SECURE_STORE_GEMINI_KEY, trimmed)) {
      clearLegacyLocalKeys();
      console.log('🟢 [GeminiAPI] API 키를 OS 보안 저장소에 암호화 보관했습니다.');
      return;
    }
    // 웹 브라우저 환경: localStorage 보관
    localStorage.setItem(GEMINI_API_STORAGE_KEY, trimmed);
    console.log('🟢 [GeminiAPI] API 키 로컬 보관 완료');
  } catch (e) {
    console.error('🔴 [GeminiAPI] 키 저장 실패:', e);
  }
}

/**
 * 현재 선택된 최적 Gemini 모델 정보를 반환합니다 (기본값: gemini-2.5-flash).
 */
export function getStoredGeminiModel(): ModelCandidate {
  try {
    const modelId = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || 'gemini-2.5-flash';
    const apiVersion = (localStorage.getItem(GEMINI_VERSION_STORAGE_KEY) as 'v1beta' | 'v1') || 'v1beta';
    return { apiVersion, modelId };
  } catch {
    return { apiVersion: 'v1beta', modelId: 'gemini-2.5-flash' };
  }
}

/**
 * 감지된 최적 Gemini 모델 정보를 로컬에 저장합니다.
 */
export function setStoredGeminiModel(modelId: string, apiVersion: 'v1beta' | 'v1' = 'v1beta') {
  try {
    localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, modelId);
    localStorage.setItem(GEMINI_VERSION_STORAGE_KEY, apiVersion);
    console.log(`🟢 [GeminiAPI] 최적 모델 저장: ${apiVersion}/${modelId}`);
  } catch (e) {
    console.error('🔴 [GeminiAPI] 모델 정보 저장 실패:', e);
  }
}

/**
 * Google ModelService.ListModels API를 호출하여 현재 API 키로 실제 사용 가능한 모델 목록을 실시간 조회합니다.
 */
export async function fetchAvailableModelsFromGoogle(apiKey: string): Promise<string[]> {
  const versions = ['v1beta', 'v1'];
  for (const v of versions) {
    try {
      const url = `https://generativelanguage.googleapis.com/${v}/models`;
      const res = await fetch(url, {
        headers: { 'x-goog-api-key': apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.models && Array.isArray(data.models)) {
          // generateContent 지원 모델만 추출 ('models/' 접두어 제거)
          const supported = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => String(m.name).replace(/^models\//, ''));
          if (supported.length > 0) {
            console.log(`🟢 [GeminiAPI] Google ListModels(${v}) 현재 활성 모델 목록:`, supported);
            return supported;
          }
        }
      } else {
        const errJson = await res.json().catch(() => null);
        console.warn(`🟡 [GeminiAPI] ListModels(${v}) 응답 오류:`, errJson?.error?.message);
      }
    } catch (e) {
      console.warn(`🟡 [GeminiAPI] ListModels(${v}) 통신 실패:`, e);
    }
  }
  return [];
}

/**
 * 특정 모델과 API 버전으로 가벼운 Ping 요청을 보내 정상 응답 여부를 테스트합니다.
 */
async function pingGeminiModel(
  apiKey: string,
  modelId: string,
  apiVersion: 'v1beta' | 'v1'
): Promise<{ success: boolean; status?: number; errorMsg?: string }> {
  const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Hello' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 5,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data?.candidates && data.candidates.length > 0) {
        return { success: true };
      }
      return { success: false, status: 200, errorMsg: '응답 형식이 유효하지 않습니다.' };
    }

    const errData = await response.json().catch(() => null);
    const msg = errData?.error?.message || `HTTP ${response.status} 오류`;
    return { success: false, status: response.status, errorMsg: msg };
  } catch (err: any) {
    return { success: false, errorMsg: err?.message || '네트워크 통신 오류' };
  }
}

/**
 * 사용자가 입력한 Gemini API 키의 유효성을 테스트하고,
 * 2026년 현재 구글에서 실제 활성화된 최신 모델을 자동 감지하여 저장합니다.
 */
export async function testGeminiApiKey(
  apiKey: string
): Promise<{ success: boolean; message: string; discoveredModel?: string }> {
  if (!apiKey || apiKey.trim() === '') {
    return { success: false, message: 'API 키가 입력되지 않았습니다.' };
  }

  const cleanKey = apiKey.trim();
  console.log('🔵 [GeminiAPI] Google AI Studio 키 검증 및 실시간 활성 모델 탐색 시작...');

  // 1. Google 공식 ListModels 실시간 조회
  const availableModels = await fetchAvailableModelsFromGoogle(cleanKey);

  // 2026년 구글 권장 우선순위
  const priorityList = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
  ];

  const candidateQueue: ModelCandidate[] = [];

  // 1-A. ListModels에서 확인된 실시간 모델을 우선 배치
  if (availableModels.length > 0) {
    for (const pref of priorityList) {
      if (availableModels.includes(pref)) {
        candidateQueue.push({ apiVersion: 'v1beta', modelId: pref });
        candidateQueue.push({ apiVersion: 'v1', modelId: pref });
      }
    }
    // 기타 generateContent 지원하는 모든 모델 보충
    for (const m of availableModels) {
      if (m.startsWith('gemini-') && !candidateQueue.some((c) => c.modelId === m)) {
        candidateQueue.push({ apiVersion: 'v1beta', modelId: m });
      }
    }
  }

  // 1-B. 기본 2026 추천 후보군 병합
  for (const fallback of DEFAULT_FALLBACK_CANDIDATES) {
    if (!candidateQueue.some((c) => c.modelId === fallback.modelId && c.apiVersion === fallback.apiVersion)) {
      candidateQueue.push(fallback);
    }
  }

  let lastError = '';

  // 2. 후보군 순차 Ping 테스트
  for (const cand of candidateQueue) {
    console.log(`🔵 [GeminiAPI] 모델 핑 테스트: ${cand.apiVersion}/${cand.modelId}`);
    const pingRes = await pingGeminiModel(cleanKey, cand.modelId, cand.apiVersion);
    if (pingRes.success) {
      console.log(`🟢 [GeminiAPI] 연결 성공! 활성 모델 확정: ${cand.modelId} (${cand.apiVersion})`);
      setStoredGeminiModel(cand.modelId, cand.apiVersion);
      return {
        success: true,
        message: `Gemini API 연결 성공! 최신 활성 모델 [${cand.modelId}]이(가) 자동 감지되었습니다.`,
        discoveredModel: cand.modelId,
      };
    } else {
      if (
        (pingRes.status === 400 && (pingRes.errorMsg?.includes('API key') || pingRes.errorMsg?.includes('API_KEY_INVALID'))) ||
        pingRes.status === 403 ||
        pingRes.errorMsg?.includes('PERMISSION_DENIED')
      ) {
        return {
          success: false,
          message: 'Google Gemini API 키가 올바르지 않거나 인증에 실패했습니다. Google AI Studio 키를 다시 확인해주세요.',
        };
      }
      if (pingRes.status === 429) {
        return {
          success: false,
          message: 'Google Gemini API 무료 호출 한도(Quota)가 일시적으로 초과되었습니다. 잠시 후 다시 시도해주세요.',
        };
      }
      lastError = pingRes.errorMsg || lastError;
    }
  }

  return {
    success: false,
    message: `연결 실패: ${lastError || '사용 가능한 Gemini 모델을 찾을 수 없습니다. API 키를 확인해주세요.'}`,
  };
}

export interface MessengerNoteAnalysisResult {
  sender: string;
  deadline: string;
  content: string;
}

/**
 * 캡처 이미지(Base64)를 Gemini 비전 AI에 전달하여
 * 학교 메신저 쪽지의 발신처, 마감일, 업무 요약을 JSON으로 추출합니다.
 * (ListModels 실시간 조회 및 2026 최신 모델 자동 전환 탑재)
 */
export async function analyzeMessengerNoteWithGemini(
  base64DataUrl: string,
  customApiKey?: string
): Promise<{ success: boolean; data?: MessengerNoteAnalysisResult; message?: string }> {
  const apiKey = (customApiKey || getStoredGeminiApiKey()).trim();

  if (!apiKey) {
    return {
      success: false,
      message: 'Gemini API 키가 등록되지 않았습니다. [API 키 등록하기]를 통해 키를 먼저 저장해주세요.',
    };
  }

  // base64DataUrl: "data:image/png;base64,....." -> mimeType과 data 분리
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return { success: false, message: '유효한 이미지 형식이 아닙니다.' };
  }

  const mimeType = match[1];
  const pureBase64 = match[2];

  const prompt = `
당신은 대한민국 초등학교 교사를 돕는 스마트 비서 AI입니다.
첨부된 이미지는 학교 업무 메신저(쿨메신저, K-에듀파인, 쪽지 등) 캡처 화면입니다.
이미지를 정밀하게 판독하여 다음 3가지 정보를 추출하여 오직 유효한 JSON 형식으로만 응답해주세요:

1. sender: 발신자 또는 발신 부서 (예: '교무부장', '연구부', '행정실', '보건실', '3학년 부장' 등). 알 수 없으면 '학교 메신저'
2. deadline: 업무 제출 마감일 또는 행사 일시 (예: '오늘 16:00', '3/28(금) 15시까지', '내일 1교시 전까지', '상시' 등). 알 수 없으면 '마감일 없음'
3. content: 선생님이 즉시 파악하고 조치해야 할 핵심 업무 내용 및 안내 사항 요약 (2~4줄의 깔끔한 개조식 요약)

응답 예시(반드시 이 JSON 구조만 반환):
{
  "sender": "교무부장",
  "deadline": "3월 26일(수) 16:00까지",
  "content": "1. 3학년 학생 건강조사서 취합 제출 안내\\n2. 행정실에 비치된 양식 확인 후 기한 내 제출 요망"
}
`;

  // 1. 구글 ListModels 실시간 모델 목록 조회 시도 (가장 정확한 2026 활성 모델 확보)
  const realTimeModels = await fetchAvailableModelsFromGoogle(apiKey);

  const retryQueue: ModelCandidate[] = [];

  if (realTimeModels.length > 0) {
    // 2026 우선순위에 맞춰 실시간 확인된 모델 큐 구성
    const livePriority = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash', 'gemini-2.5-pro'];
    for (const p of livePriority) {
      if (realTimeModels.includes(p)) {
        retryQueue.push({ apiVersion: 'v1beta', modelId: p });
        retryQueue.push({ apiVersion: 'v1', modelId: p });
      }
    }
    for (const rm of realTimeModels) {
      if (rm.startsWith('gemini-') && !retryQueue.some((c) => c.modelId === rm)) {
        retryQueue.push({ apiVersion: 'v1beta', modelId: rm });
      }
    }
  }

  // 2. 만약 ListModels 조회가 불가한 경우, 기본 2026 후보군 추가
  const currentModel = getStoredGeminiModel();
  if (!retryQueue.some((c) => c.modelId === currentModel.modelId)) {
    retryQueue.push(currentModel);
  }
  for (const cand of DEFAULT_FALLBACK_CANDIDATES) {
    if (!retryQueue.some((c) => c.modelId === cand.modelId && c.apiVersion === cand.apiVersion)) {
      retryQueue.push(cand);
    }
  }

  console.log('🔵 [GeminiAPI] 쪽지 비전 분석 후보 큐:', retryQueue.map((c) => `${c.apiVersion}/${c.modelId}`));

  let lastErrMsg = '';

  for (const cand of retryQueue) {
    const endpoint = `https://generativelanguage.googleapis.com/${cand.apiVersion}/models/${cand.modelId}:generateContent`;

    try {
      console.log(`🔵 [GeminiAPI] 비전 분석 요청 시도: ${cand.apiVersion}/${cand.modelId}`);

      // Google 공식 REST API 규격 (inlineData / mimeType 표준)
      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: pureBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}`;
        lastErrMsg = errMsg;

        // 인증 에러 시 즉시 명확히 안내
        if (
          (response.status === 400 && (errMsg.includes('API key') || errMsg.includes('API_KEY_INVALID'))) ||
          response.status === 403 ||
          errMsg.includes('PERMISSION_DENIED')
        ) {
          return {
            success: false,
            message: 'Google Gemini API 키가 올바르지 않거나 인증에 실패했습니다. Google AI Studio 키를 다시 확인해주세요.',
          };
        }

        if (response.status === 429) {
          return {
            success: false,
            message: 'Google Gemini API 무료 호출 한도(Quota)가 일시적으로 초과되었습니다. 잠시 후 다시 시도해주세요.',
          };
        }

        console.warn(`🟡 [GeminiAPI] ${cand.modelId} 실패 (${errMsg}), 다음 활성 모델로 자동 전환...`);
        continue;
      }

      const resData = await response.json();
      const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        lastErrMsg = 'AI로부터 빈 응답이 수신되었습니다.';
        continue;
      }

      // JSON 파싱 (마크다운 백틱 대응)
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed: MessengerNoteAnalysisResult = JSON.parse(cleaned);

      // 성공한 모델을 최적 모델로 자동 갱신
      setStoredGeminiModel(cand.modelId, cand.apiVersion);
      console.log(`🟢 [GeminiAPI] 쪽지 분석 성공 (작동 모델: ${cand.modelId})`, parsed);

      return {
        success: true,
        data: {
          sender: parsed.sender || '학교 메신저',
          deadline: parsed.deadline || '마감일 없음',
          content: parsed.content || '업무 내용',
        },
      };
    } catch (error: any) {
      console.warn(`🟡 [GeminiAPI] 통신 예외 발생 (${cand.modelId}):`, error);
      lastErrMsg = error?.message || '네트워크 오류';
    }
  }

  console.error('🔴 [GeminiAPI] 모든 모델 분석 시도 실패:', lastErrMsg);
  return {
    success: false,
    message: `분석 실패: ${lastErrMsg || '사용 가능한 Gemini 모델을 찾을 수 없습니다. API 키를 확인해주세요.'}`,
  };
}

/**
 * 🧠 범용: 프롬프트(+선택 첨부 파일)를 보내 JSON 응답을 받습니다.
 * - 저장된 모델 → 기본 후보 순으로 시도, 키 오류·한도 초과는 바로 안내
 */
export async function geminiGenerateJson<T = any>(
  prompt: string,
  inline?: { mimeType: string; base64: string }
): Promise<{ success: boolean; data?: T; message?: string }> {
  const apiKey = getStoredGeminiApiKey().trim();
  if (!apiKey) return { success: false, message: 'Gemini API 키가 등록되지 않았습니다.' };
  const queue: ModelCandidate[] = [getStoredGeminiModel(), ...DEFAULT_FALLBACK_CANDIDATES].filter(
    (c, i, a) => a.findIndex((x) => x.modelId === c.modelId && x.apiVersion === c.apiVersion) === i
  );
  let lastErr = '';
  for (const cand of queue) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${cand.apiVersion}/models/${cand.modelId}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, ...(inline ? [{ inlineData: { mimeType: inline.mimeType, data: inline.base64 } }] : [])] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        const msg = j?.error?.message || `HTTP ${res.status}`;
        lastErr = msg;
        if (res.status === 403 || msg.includes('API key') || msg.includes('API_KEY_INVALID')) {
          return { success: false, message: 'Gemini API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.' };
        }
        if (res.status === 429) return { success: false, message: 'Gemini 무료 사용 한도를 잠시 넘었어요. 잠시 후 다시 시도해 주세요.' };
        continue;
      }
      const j = await res.json();
      const text: string = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
      const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      try {
        setStoredGeminiModel(cand.modelId, cand.apiVersion);
        return { success: true, data: JSON.parse(cleaned) as T };
      } catch {
        lastErr = 'AI 응답을 읽지 못했습니다.';
      }
    } catch (e: any) {
      lastErr = e?.message || '네트워크 오류';
    }
  }
  return { success: false, message: `AI 판독에 실패했습니다: ${lastErr}` };
}
