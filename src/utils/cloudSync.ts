/**
 * ============================================================================
 * [cloudSync.ts] 구글 드라이브 및 멀티 디바이스 클라우드 동기화 모듈
 * ============================================================================
 * 학교 교실 PC(Windows), 자택 PC/Mac, 교사용 태블릿(iPad, Galaxy Tab) 어디서든
 * 동일한 학급 데이터(설정, 위젯 배치, 출결, 시정표, 메모 등)를 안전하게 이어갈 수 있도록
 * 구글 드라이브 클라우드 동기화 및 원클릭 JSON 백업/복원 기능을 제공합니다.
 */

import { encryptBackup, decryptBackup, isEncryptedBackup } from './backupCrypto';
import { isLargeKey, largeGet, largeSet } from './largeStore';

// 대시보드 저장소 키 목록
export const BACKUP_STORAGE_KEYS = [
  'class_dashboard_config',
  'class_dashboard_students',
  'class_dashboard_roles',
  'class_dashboard_teams',
  'class_dashboard_schedule',
  'class_dashboard_agendas',
  'class_dashboard_widget_order',
  'class_dashboard_widget_spans',
  'class_dashboard_widget_opacities',
  'class_dashboard_pinned_widgets',
  'class_dashboard_postits',
  'class_dashboard_messenger_notes',
  'class_dashboard_observation_records',
  'class_dashboard_praise_logs',
  'class_dashboard_placement_mode',
  'class_dashboard_gcal_config',
  'focusWidgetIds',
  'ttime_whiteboard_slides', // 🎨 판서 모드 멀티 슬라이드 데이터
  'ttime_whiteboard_current_slide_index', // 🎨 판서 모드 마지막 작업 슬라이드 번호
  'ttime_idea_notes', // 💡 스마트 아이디어 노트 목록
  'ttime_idea_settings', // 💡 아이디어 노트 환경설정
];

// 🎨 판서 모드 멀티 슬라이드 데이터 인터페이스
export interface WhiteboardSlide {
  id: string;
  pageNumber: number;
  strokes?: any[];
  elements?: any[];
  imageData?: string; // Base64 Data URL (캔버스 풀 해상도)
  texts?: any[];
  tapes?: any[];
  polys?: any[]; // 📐 각도 표시용 도형 꼭짓점
  previewThumbnail: string; // Base64 Data URL (목록 썸네일)
  updatedAt: string;
}

export interface DashboardBackupData {
  version: string;
  exportedAt: string;
  sourceDevice: string;
  data: Record<string, any>;
}

// 🛡️ 백업·복원 대상에서 항상 제외하는 민감 키 (API 키, 잠금 PIN 등)
const SENSITIVE_KEY_PATTERN = /(api_?key|apikey|secret|token|password|pin_hash|lock_pin|recovery)/i;

/** 설정 객체 안의 API 키·비밀번호 필드를 제거합니다. */
function stripSecretsFromConfig(value: any): any {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const { apiKeys: _apiKeys, ...rest } = value;
  if (rest.securityConfig && typeof rest.securityConfig === 'object') {
    const { passwordHash: _pw, ...sec } = rest.securityConfig;
    rest.securityConfig = sec;
  }
  return rest;
}

/**
 * 현재 로컬 스토리지의 모든 학급 데이터를 JSON 백업 데이터 객체로 추출합니다.
 * (API 키·잠금 PIN 등 민감정보는 포함하지 않습니다)
 */
export function getDashboardBackupObject(): DashboardBackupData {
  const data: Record<string, any> = {};

  BACKUP_STORAGE_KEYS.forEach((key) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) return;
    try {
      // 판서·아이디어 노트는 IndexedDB(대용량 저장소)에서 읽음
      const val = isLargeKey(key) ? largeGet(key) : localStorage.getItem(key);
      if (val !== null) {
        try {
          data[key] = JSON.parse(val);
        } catch {
          data[key] = val;
        }
        if (key === 'class_dashboard_config' || key === 'class_dashboard_gcal_config') {
          data[key] = stripSecretsFromConfig(data[key]);
        }
      }
    } catch (e) {
      console.warn(`🟡 [CloudSync] 키 추출 실패: ${key}`, e);
    }
  });

  return {
    version: '2026.1.0',
    exportedAt: new Date().toISOString(),
    sourceDevice: navigator.userAgent.includes('Windows')
      ? 'Windows PC'
      : navigator.userAgent.includes('Mac')
      ? 'Mac'
      : navigator.userAgent.includes('iPad') || navigator.userAgent.includes('iPhone')
      ? 'iPad/iOS'
      : navigator.userAgent.includes('Android')
      ? 'Android Tablet'
      : 'Web Browser',
    data,
  };
}

/**
 * 💾 원클릭 JSON 백업 파일 다운로드 (smart_dashboard_backup.json)
 */
export async function exportDashboardBackupFile(customFilename?: string, passphrase?: string): Promise<boolean> {
  try {
    const backupObj = getDashboardBackupObject();
    // 🔐 백업 암호가 있으면 AES-256-GCM 암호화 파일로 저장
    const payload = passphrase ? await encryptBackup(backupObj, passphrase) : backupObj;
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateTag = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const filename = customFilename || `smart_dashboard_backup_${dateTag}${passphrase ? '_encrypted' : ''}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    try { localStorage.setItem('last_full_backup_at', String(Date.now())); } catch { /* 무시 */ }
    console.log('🟢 [CloudSync] 대시보드 백업 파일 내보내기 완료:', filename);
    return true;
  } catch (error) {
    console.error('🔴 [CloudSync] 백업 파일 내보내기 실패:', error);
    return false;
  }
}

/**
 * 📥 JSON 백업 파일 데이터 복원
 */
export async function restoreDashboardBackup(
  jsonString: string,
  passphrase?: string
): Promise<{ success: boolean; message: string; timestamp?: string; needsPassphrase?: boolean }> {
  try {
    let parsed: DashboardBackupData = JSON.parse(jsonString);

    // 🔐 암호화된 백업 파일이면 백업 암호로 복호화
    if (isEncryptedBackup(parsed)) {
      if (!passphrase) {
        return { success: false, needsPassphrase: true, message: '암호화된 백업 파일입니다. [백업 암호]를 입력한 뒤 다시 불러와 주세요.' };
      }
      parsed = await decryptBackup<DashboardBackupData>(parsed, passphrase);
    }

    if (!parsed || !parsed.data || typeof parsed.data !== 'object') {
      return { success: false, message: '올바른 스마트 학급 대시보드 백업 파일 형식이 아닙니다.' };
    }

    // 각 키별로 localStorage에 안전하게 복원
    let restoredCount = 0;
    Object.entries(parsed.data).forEach(([k, v]) => {
      // 🛡️ 백업 파일에 민감 키가 들어 있어도 복원하지 않습니다 (기존 API 키·PIN 보존)
      if (SENSITIVE_KEY_PATTERN.test(k)) return;
      if (BACKUP_STORAGE_KEYS.includes(k) || k.startsWith('class_dashboard_')) {
        try {
          let restoredValue: any = v;
          if (k === 'class_dashboard_config' || k === 'class_dashboard_gcal_config') {
            // 현재 기기의 API 키·보안 설정은 유지하고 나머지만 복원
            let current: any = {};
            try {
              current = JSON.parse(localStorage.getItem(k) || '{}') || {};
            } catch {}
            const incoming = stripSecretsFromConfig(typeof v === 'string' ? JSON.parse(v) : v);
            restoredValue = {
              ...incoming,
              ...(current.apiKeys ? { apiKeys: current.apiKeys } : {}),
              securityConfig: { ...(incoming?.securityConfig || {}), ...(current.securityConfig?.passwordHash !== undefined ? { passwordHash: current.securityConfig.passwordHash } : {}) },
            };
          }
          const valToStore = typeof restoredValue === 'string' ? restoredValue : JSON.stringify(restoredValue);
          if (isLargeKey(k)) largeSet(k, valToStore);
          else localStorage.setItem(k, valToStore);
          restoredCount++;
        } catch (e) {
          console.warn(`🟡 [CloudSync] 키 복원 실패: ${k}`, e);
        }
      }
    });

    console.log(`🟢 [CloudSync] 백업 데이터 복원 완료 (${restoredCount}개 항목 복원)`);
    return {
      success: true,
      message: `${restoredCount}개 학급 데이터 항목이 성공적으로 복원되었습니다.`,
      timestamp: parsed.exportedAt,
    };
  } catch (error: any) {
    console.error('🔴 [CloudSync] 백업 데이터 파싱 오류:', error);
    return { success: false, message: `복원 중 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}` };
  }
}

/**
 * 구글 드라이브 동기화 상태 저장 및 조회
 */
const CLOUD_SYNC_STATUS_KEY = 'class_dashboard_cloud_sync_info';

export interface CloudSyncInfo {
  lastSyncTime: string;
  status: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  lastBackupSize?: number;
  device: string;
  accountEmail?: string;
  errorMessage?: string;
}

export function getLocalCloudSyncInfo(): CloudSyncInfo {
  try {
    const saved = localStorage.getItem(CLOUD_SYNC_STATUS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    lastSyncTime: '',
    status: 'IDLE',
    device: navigator.platform || 'Browser',
  };
}

export function saveLocalCloudSyncInfo(info: Partial<CloudSyncInfo>) {
  try {
    const current = getLocalCloudSyncInfo();
    const updated: CloudSyncInfo = { ...current, ...info };
    localStorage.setItem(CLOUD_SYNC_STATUS_KEY, JSON.stringify(updated));
    return updated;
  } catch {}
  return info;
}

/**
 * 📜 [Class in 구글 드라이브 전용 백업 Apps Script 소스 코드]
 * API 키 없이 선생님의 개인 구글 드라이브 'Class in Backup' 폴더에
 * 날짜별 JSON 백업 파일을 안전하게 자동 생성 및 보관합니다.
 */
export const GOOGLE_DRIVE_BACKUP_SCRIPT_CODE = `// [Class in 구글 드라이브 전용 백업 Apps Script]
// 내 구글 드라이브의 'Class in Backup' 폴더에 날짜별 백업(.json)을 저장하고, 최근 30개만 남깁니다.

var FOLDER_NAME = "Class in Backup";
var KEEP_COUNT = 30; // 보관할 최근 백업 개수

// 웹 앱 주소를 브라우저로 열었을 때 작동 확인용
function doGet(e) {
  return json_({ status: "success", message: "Class in 구글 드라이브 백업 웹 앱이 정상 작동 중입니다." });
}

// (선택) 보안 토큰: [프로젝트 설정 → 스크립트 속성]에 WEBHOOK_TOKEN 을 추가하고,
// 대시보드에 넣는 웹 앱 주소 끝에 ?token=같은값 을 붙이면 주소를 아는 다른 사람의 기록을 막습니다.
function isAuthorized_(e) {
  var expected = PropertiesService.getScriptProperties().getProperty("WEBHOOK_TOKEN");
  if (!expected) return true;
  return !!(e && e.parameter && e.parameter.token === expected);
}

function doPost(e) {
  try {
    if (!isAuthorized_(e)) return json_({ status: "error", message: "unauthorized" });
    if (!e || !e.postData || !e.postData.contents) return json_({ status: "error", message: "보낸 데이터가 없습니다." });
    var data = JSON.parse(e.postData.contents); // 형식 검사

    var folders = DriveApp.getFoldersByName(FOLDER_NAME);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);

    var fileName = "Class_in_Backup_" + Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd_HHmmss") + ".json";
    var file = folder.createFile(fileName, JSON.stringify(data), "application/json");

    cleanup_(folder);
    return json_({ status: "success", fileName: fileName, fileUrl: file.getUrl() });
  } catch (error) {
    return json_({ status: "error", message: String(error) });
  }
}

// 오래된 백업 정리 (최근 KEEP_COUNT 개만 남기고 휴지통으로)
function cleanup_(folder) {
  var list = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().indexOf("Class_in_Backup_") === 0) list.push(f);
  }
  list.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  for (var i = KEEP_COUNT; i < list.length; i++) list[i].setTrashed(true);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

/**
 * ☁️ Google Apps Script 웹 앱으로 현재 대시보드 전체 백업 데이터 전송
 */
export async function sendBackupToGoogleDrive(
  webhookUrl: string,
  passphrase?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = webhookUrl.trim();
    if (!cleanUrl || !cleanUrl.startsWith('http')) {
      return { success: false, message: '유효한 구글 웹 앱 URL을 입력해 주세요.' };
    }

    if (!cleanUrl.startsWith('https://script.google.com/') && !cleanUrl.startsWith('https://script.googleusercontent.com/')) {
      return { success: false, message: '구글 Apps Script 웹 앱 주소(https://script.google.com/...)만 사용할 수 있습니다.' };
    }

    const backupObj = getDashboardBackupObject();
    // 🔐 백업 암호가 있으면 학생 정보가 담긴 전체 백업을 암호화하여 전송 (구글 드라이브에는 암호문만 저장)
    const outgoing = passphrase ? await encryptBackup(backupObj, passphrase) : backupObj;

    const payload = JSON.stringify(outgoing);
    const api = (window as any).electronAPI;
    let fileName = '';
    if (api?.postJson) {
      // 데스크톱 앱: 결과를 실제로 확인 (성공 여부 · 저장된 파일 이름)
      const r = await api.postJson(cleanUrl, payload);
      if (!r?.ok) throw new Error(r?.error || `HTTP ${r?.status}`);
      const text = String(r.text || '');
      if (/<html|accounts\.google\.com|ServiceLogin/i.test(text) && !text.trim().startsWith('{')) {
        throw new Error("웹 앱 접근이 막혀 있어요. 배포 설정에서 '액세스 권한이 있는 사용자'를 [모든 사용자]로 바꿔 새 버전으로 다시 배포해 주세요.");
      }
      let res: any = null;
      try {
        res = JSON.parse(text);
      } catch {
        throw new Error('웹 앱 응답을 읽지 못했어요. 최신 백업 스크립트로 다시 배포했는지 확인해 주세요.');
      }
      if (res?.status !== 'success') {
        throw new Error(res?.message === 'unauthorized' ? '토큰이 맞지 않아요. 웹 앱 주소 끝의 ?token= 값을 확인해 주세요.' : res?.message || '알 수 없는 오류');
      }
      fileName = res.fileName || '';
    } else {
      // 웹 브라우저: 결과를 읽을 수 없는 방식(no-cors)으로만 보낼 수 있음
      await fetch(cleanUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload });
    }

    const nowStr = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    saveLocalCloudSyncInfo({
      lastSyncTime: nowStr,
      status: 'SUCCESS',
    });

    return {
      success: true,
      message: `${passphrase ? '🔐 암호화된 ' : ''}학급 백업을 구글 드라이브 "Class in Backup" 폴더에 저장했습니다${fileName ? ` (${fileName})` : ''}.${
        api?.postJson ? '' : ' (웹 브라우저에서는 저장 결과를 확인할 수 없으니 드라이브에서 파일을 확인해 주세요)'
      }${passphrase ? ' 복원할 때 백업 암호가 필요해요.' : ''}`,
    };
  } catch (err: any) {
    console.error('🔴 [CloudSync] 구글 드라이브 백업 전송 실패:', err);
    saveLocalCloudSyncInfo({
      status: 'ERROR',
      errorMessage: err?.message || '네트워크 오류',
    });
    return {
      success: false,
      message: `구글 드라이브 백업 전송 중 오류가 발생했습니다: ${err?.message || '네트워크 오류'}`,
    };
  }
}

