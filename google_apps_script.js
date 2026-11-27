/**
 * ==============================================================================
 * 🏫 2026 스마트 학급 대시보드 - Google Apps Script (GAS) 통합 백업 엔진
 * ==============================================================================
 * 
 * [1분 설치 및 배포 방법]
 * 1. 선생님의 개인 구글 드라이브에서 새 'Google 스프레드시트'를 생성합니다.
 *    (예: 2026학년도 3학년 1반 학급 운영 데이터)
 * 2. 상단 메뉴에서 [확장 프로그램] ➔ [Apps Script]를 클릭합니다.
 * 3. 기존 코드를 모두 지우고 이 파일의 전체 코드를 복사하여 붙여넣습니다.
 * 4. 상단 [배포] ➔ [새 배포] 클릭:
 *    - 유형 선택: '웹 앱'
 *    - 설명: '스마트 학급 대시보드 통합 연동 v2.0'
 *    - 다음 사용자 권한으로 실행: '나 (선생님 구글 계정)'
 *    - 액세스 권한이 있는 사용자: '모든 사용자 (Anyone)'  <-- 반드시 선택!
 * 5. [배포] 버튼을 누른 후 생성된 [웹 앱 URL]을 복사하여
 *    대시보드 [환경설정 ➔ 5단계 ➔ 구글 스프레드시트 Webhook URL]에 붙여넣으면 연동 완료!
 * ==============================================================================
 * 
 * [포함된 주요 백업 기능]:
 * 1. 📊 출결관리 선별 백업: 결석·조퇴·출석인정 학생만 세부내용과 함께 자동 백업
 *    - [시트 1] '일일 출결 현황': [날짜, 번호, 학생명, 출결상태, 사유구분, 세부내용, 최종동기화일시]
 *    - [시트 2] '월별 출결현황': [월, 날짜, 번호, 학생명, 출결유형, 출결사유, 기록일시]
 * 2. 📝 학생 관찰 및 상담 기록 백업 ('상담일지' 시트: [상담날짜, 번호, 이름, 유형, 상담내용] 5개 열)
 * 3. 🌟 칭찬 도장 부여 히스토리 백업 ('칭찬도장히스토리' 시트)
 * 4. 🗄️ 학급 대시보드 전체 스냅샷 백업 ('학급데이터백업' 시트)
 * ==============================================================================
 */

// 1. GET 요청 핸들러 (연동 테스트 및 상태 확인)
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "success",
      message: "🟢 2026 스마트 학급 대시보드 구글 스프레드시트 통합 Webhook이 정상 작동 중입니다.",
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// 🔐 [보안 권장] 웹훅 토큰 검증
//  - Apps Script 편집기 > 프로젝트 설정(⚙️) > 스크립트 속성 > [속성 추가]
//    이름: WEBHOOK_TOKEN / 값: 영문·숫자 20자 이상 임의 문자열
//  - 대시보드 환경설정에 넣는 웹 앱 주소 끝에 ?token=같은값 을 붙여 주세요.
//    예) https://script.google.com/macros/s/AKfy.../exec?token=Abc123...
//  - 토큰을 설정하지 않으면 기존처럼 동작합니다(하위 호환).
function isAuthorized_(e) {
  var expected = PropertiesService.getScriptProperties().getProperty("WEBHOOK_TOKEN");
  if (!expected) return true;
  return !!(e && e.parameter && e.parameter.token === expected);
}

// 2. POST 요청 핸들러
function doPost(e) {
  if (!isAuthorized_(e)) {
    return createJsonResponse({ status: "error", message: "unauthorized" });
  }

  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var rawData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        rawData = JSON.parse(e.postData.contents);
      } catch (err) {
        rawData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      rawData = e.parameter;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = rawData.action || "unknown";

    // -------------------------------------------------------------
    // [A] 출결관리 선별 백업 (결석, 조퇴, 출석인정 학생만 저장)
    // -------------------------------------------------------------
    if (action === "backup_daily" || action === "test" || rawData.records || Array.isArray(rawData)) {
      var items = [];
      if (Array.isArray(rawData)) {
        items = rawData;
      } else if (rawData.records && Array.isArray(rawData.records)) {
        items = rawData.records;
      } else {
        items = [rawData];
      }

      if (items.length === 0 || !items[0]) {
        return createJsonResponse({ status: "empty", message: "전송된 출결 데이터가 없습니다." });
      }

      var nowKST = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
      var todayStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
      var targetDate = items[0].date ? formatDate(items[0].date) : todayStr;
      var targetMonth = targetDate.substring(0, 7);

      // [시트 1] '일일 출결 현황'
      var dailySheet = ss.getSheetByName("일일 출결 현황");
      if (!dailySheet) {
        dailySheet = ss.getSheets()[0];
        dailySheet.setName("일일 출결 현황");
      }

      // 7개 열 헤더 설정 ('세부내용' 표준 적용)
      var dailyHeaders = [["날짜", "번호", "학생명", "출결상태", "사유구분", "세부내용", "최종동기화일시"]];
      if (dailySheet.getLastRow() === 0 || dailySheet.getRange(1, 1).getValue() !== "날짜" || dailySheet.getRange(1, 6).getValue() !== "세부내용") {
        if (dailySheet.getLastRow() > 0) {
          dailySheet.getRange(1, 1, 1, 7).setValues(dailyHeaders);
        } else {
          dailySheet.insertRowBefore(1);
          dailySheet.getRange(1, 1, 1, 7).setValues(dailyHeaders);
        }
        dailySheet.getRange(1, 1, 1, 7).setBackground("#4F46E5").setFontColor("#FFFFFF").setFontWeight("bold");
        dailySheet.setFrozenRows(1);
      }

      // 기존 당일 데이터 역순 삭제 (중복 방지)
      var lastRowDaily = dailySheet.getLastRow();
      if (lastRowDaily > 1) {
        var dateRange = dailySheet.getRange(2, 1, lastRowDaily - 1, 1).getValues();
        for (var r = dateRange.length - 1; r >= 0; r--) {
          if (formatDate(dateRange[r][0]) === targetDate) {
            dailySheet.deleteRow(r + 2);
          }
        }
      }

      var dailyRows = [];
      var exceptionRows = [];

      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var num = it.number !== undefined ? it.number : (i + 1);
        var name = it.studentName || it.name || "학생";
        var statusKorean = convertStatusToKorean(it.status || it.attendance);

        // 사유 구분 (질병, 출석인정, 미인정, 기타)
        var cat = it.reasonCategory || it.category || it.neisCategory || "";

        // 🎯 [핵심 필터링] 백업 대상 선별: '결석', '조퇴', '출석인정'만 저장 (일반 출석/지각/보건실 제외)
        var isAbsentOrEarly = (statusKorean === "결석" || statusKorean === "조퇴" || it.attendance === "absent" || it.attendance === "early");
        var isAcknowledged = (cat === "출석인정" || statusKorean === "출석인정" || it.reasonCategory === "출석인정" || (it.attendanceReasonCategory && it.attendanceReasonCategory === "출석인정"));

        // 테스트 액션이 아닐 때 대상 외 항목은 제외
        if (action !== "test" && !isAbsentOrEarly && !isAcknowledged) {
          continue;
        }

        // 세부 사유 메모 추출
        var detail = extractDetailMemo(it);

        // 장기 결석 표기
        var isLongTerm = it.isLongTerm || it.longTerm || (it.absenceReason && it.absenceReason.isLongTerm);
        if (isLongTerm && detail.indexOf("[장기") === -1) {
          var rangeText = "";
          if (it.longTermRange && typeof it.longTermRange === "object" && it.longTermRange.start) {
            rangeText = ": " + it.longTermRange.start + " ~ " + it.longTermRange.end;
          }
          detail = "[장기" + rangeText + "] " + (detail || "");
          detail = detail.trim();
        }

        // 조퇴 교시 표기
        if ((statusKorean === "조퇴" || it.attendance === "early") && it.earlyPeriod) {
          if (detail.indexOf(it.earlyPeriod) === -1) {
            detail = "[" + it.earlyPeriod + "] " + (detail || "");
            detail = detail.trim();
          }
        }

        dailyRows.push([
          targetDate,
          num,
          name,
          statusKorean,
          cat,
          detail,
          nowKST
        ]);

        // [시트 2] '월별 출결현황'용
        exceptionRows.push([
          targetMonth,
          targetDate,
          num,
          name,
          statusKorean,
          detail || cat || "사유 미기재",
          nowKST
        ]);
      }

      // 시트 1에 데이터 추가
      if (dailyRows.length > 0) {
        dailySheet.getRange(dailySheet.getLastRow() + 1, 1, dailyRows.length, 7).setValues(dailyRows);
        for (var c = 1; c <= 7; c++) {
          dailySheet.autoResizeColumn(c);
        }
      }

      // 시트 1 필터 적용
      try {
        var curFilter = dailySheet.getFilter();
        if (curFilter) curFilter.remove();
        dailySheet.getRange(1, 1, dailySheet.getLastRow(), 7).createFilter();
      } catch (fErr) {}

      // [시트 2] '월별 출결현황'
      var monthlySheet = ss.getSheetByName("월별 출결현황");
      if (!monthlySheet) {
        monthlySheet = ss.insertSheet("월별 출결현황");
      }

      var monthlyHeaders = [["월", "날짜", "번호", "학생명", "출결유형", "출결사유", "기록일시"]];
      if (monthlySheet.getLastRow() === 0 || monthlySheet.getRange(1, 1).getValue() !== "월") {
        if (monthlySheet.getLastRow() > 0) monthlySheet.insertRowBefore(1);
        monthlySheet.getRange(1, 1, 1, 7).setValues(monthlyHeaders);
        monthlySheet.getRange(1, 1, 1, 7).setBackground("#0D9488").setFontColor("#FFFFFF").setFontWeight("bold");
        monthlySheet.setFrozenRows(1);
      }

      var lastRowMonthly = monthlySheet.getLastRow();
      if (lastRowMonthly > 1) {
        var monthlyDates = monthlySheet.getRange(2, 2, lastRowMonthly - 1, 1).getValues();
        for (var mr = monthlyDates.length - 1; mr >= 0; mr--) {
          if (formatDate(monthlyDates[mr][0]) === targetDate) {
            monthlySheet.deleteRow(mr + 2);
          }
        }
      }

      if (exceptionRows.length > 0) {
        monthlySheet.getRange(monthlySheet.getLastRow() + 1, 1, exceptionRows.length, 7).setValues(exceptionRows);
        for (var mc = 1; mc <= 7; mc++) {
          monthlySheet.autoResizeColumn(mc);
        }
      }

      try {
        var mFilter = monthlySheet.getFilter();
        if (mFilter) mFilter.remove();
        monthlySheet.getRange(1, 1, monthlySheet.getLastRow(), 7).createFilter();
      } catch (mfErr) {}

      return createJsonResponse({
        status: "success",
        message: targetDate + " 출결 백업 완료 (결석·조퇴·출석인정 " + dailyRows.length + "명)"
      });
    }

    // -------------------------------------------------------------
    // [B] 학생 관찰 및 상담 기록 백업 (5개 열: 상담날짜, 번호, 이름, 유형, 상담내용)
    // -------------------------------------------------------------
    if (action === "save_observation" || action === "addObservation" || action === "batchObservation" || rawData.studentName) {
      var obsSheetName = "상담일지";
      var obsSheet = ss.getSheetByName(obsSheetName);
      if (!obsSheet) {
        obsSheet = ss.insertSheet(obsSheetName);
      }

      var obsHeaders = [["상담날짜", "번호", "이름", "유형", "상담내용"]];
      if (obsSheet.getLastRow() === 0 || obsSheet.getRange(1, 1).getValue() !== "상담날짜") {
        if (obsSheet.getLastRow() > 0) obsSheet.insertRowBefore(1);
        obsSheet.getRange(1, 1, 1, 5).setValues(obsHeaders);
        obsSheet.getRange(1, 1, 1, 5).setBackground("#059669").setFontColor("#FFFFFF").setFontWeight("bold");
        obsSheet.setFrozenRows(1);
      }

      var obsItems = [];
      if (Array.isArray(rawData)) {
        obsItems = rawData;
      } else if (rawData.records && Array.isArray(rawData.records)) {
        obsItems = rawData.records;
      } else if (rawData.record) {
        obsItems = [rawData.record];
      } else {
        obsItems = [rawData];
      }

      var todayStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
      var obsRows = [];

      for (var oi = 0; oi < obsItems.length; oi++) {
        var ob = obsItems[oi];
        if (!ob) continue;

        var obDate = ob.date || ob.consultDate || todayStr;
        var obNum = ob.studentNumber !== undefined ? ob.studentNumber : (ob.number !== undefined ? ob.number : (ob.studentId || ""));
        var obName = ob.studentName || ob.name || "학생";
        var obType = ob.type || ob.consultType || "관찰";
        var obContent = ob.content || ob.memo || "";

        if (!obContent && ob.action === "test") {
          obContent = "스마트 학급 대시보드 상담일지 구글 시트 연동 테스트 성공!";
        }

        obsRows.push([obDate, obNum, obName, obType, obContent]);
      }

      if (obsRows.length > 0) {
        var startRow = obsSheet.getLastRow() + 1;
        obsSheet.getRange(startRow, 1, obsRows.length, 5).setValues(obsRows);
        for (var oc = 1; oc <= 5; oc++) {
          obsSheet.autoResizeColumn(oc);
        }
      }

      return createJsonResponse({
        status: "success",
        message: "상담일지 " + obsRows.length + "건이 성공적으로 시트에 저장되었습니다."
      });
    }

    // -------------------------------------------------------------
    // [C] 개인 칭찬 도장 부여 히스토리 저장
    // -------------------------------------------------------------
    if (action === "save_praise") {
      var praiseSheetName = "칭찬도장히스토리";
      var praiseSheet = ss.getSheetByName(praiseSheetName);
      if (!praiseSheet) {
        praiseSheet = ss.insertSheet(praiseSheetName);
        praiseSheet.appendRow(["부여일시", "학생번호", "학생이름", "칭찬항목", "부여점수", "비고"]);
        praiseSheet.getRange("A1:F1").setBackground("#f59e0b").setFontColor("#ffffff").setFontWeight("bold");
        praiseSheet.setFrozenRows(1);
      }

      var log = rawData.log || {};
      praiseSheet.appendRow([
        (log.date || "") + " " + (log.time || ""),
        log.studentId || "",
        log.studentName || "",
        log.itemLabel || "칭찬 도장",
        log.points || 1,
        log.note || ""
      ]);

      return createJsonResponse({ status: "success", message: "칭찬 도장 로그가 시트에 기록되었습니다." });
    }

    // -------------------------------------------------------------
    // [D] 학급 대시보드 전체 스냅샷 백업
    // -------------------------------------------------------------
    if (action === "backup_dashboard") {
      var dashSheetName = "학급데이터백업";
      var dashSheet = ss.getSheetByName(dashSheetName);
      if (!dashSheet) {
        dashSheet = ss.insertSheet(dashSheetName);
        dashSheet.appendRow(["백업일시", "학급명", "담임교사", "총학생수", "모둠수", "데이터요약"]);
        dashSheet.getRange("A1:F1").setBackground("#10b981").setFontColor("#ffffff").setFontWeight("bold");
        dashSheet.setFrozenRows(1);
      }

      var payload = rawData.payload || {};
      dashSheet.appendRow([
        new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
        payload.schoolName || "우리 반",
        payload.teacherName || "",
        payload.studentsCount || 0,
        payload.teamsCount || 0,
        JSON.stringify(payload).substring(0, 500)
      ]);

      return createJsonResponse({ status: "success", message: "학급 대시보드 전체 스냅샷 백업이 완료되었습니다." });
    }

    return createJsonResponse({ status: "success", message: "데이터 수신 완료 (Action: " + action + ")" });

  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// [헬퍼 함수] 세부 사유 메모 심층 추출
// -------------------------------------------------------------
function extractDetailMemo(item) {
  if (!item) return "";

  var candidates = [
    item.reasonDetail,
    item.memo,
    item.detailMemo,
    item.detail,
    item.reasonNote,
    item.attendanceNote,
    item.attendanceReasonDetail,
    item.customMemo,
    item.customReason,
    item.subReason,
    item.note,
    item.quickReason,
    item.content
  ];

  for (var i = 0; i < candidates.length; i++) {
    if (candidates[i] && typeof candidates[i] === "string" && candidates[i].trim() !== "") {
      return candidates[i].trim();
    }
  }

  var subObjects = [item.absenceReason, item.reasonData, item.details, item.attendanceDetail];
  for (var s = 0; s < subObjects.length; s++) {
    var sub = subObjects[s];
    if (sub && typeof sub === "object") {
      var subCandidates = [
        sub.reasonDetail,
        sub.memo,
        sub.detailMemo,
        sub.detail,
        sub.reasonNote,
        sub.customMemo,
        sub.content,
        sub.note,
        sub.text
      ];
      for (var k = 0; k < subCandidates.length; k++) {
        if (subCandidates[k] && typeof subCandidates[k] === "string" && subCandidates[k].trim() !== "") {
          return subCandidates[k].trim();
        }
      }
    }
  }

  return "";
}

function convertStatusToKorean(val) {
  if (!val) return "출석";
  var s = String(val).trim().toLowerCase();
  if (s === "present" || s === "출석") return "출석";
  if (s === "absent" || s === "결석") return "결석";
  if (s === "late" || s === "지각") return "지각";
  if (s === "early" || s === "조퇴") return "조퇴";
  if (s === "nurse" || s === "clinic" || s === "health" || s === "보건" || s === "보건실") return "보건실";
  return val;
}

function formatDate(val) {
  if (!val) return "";
  if (val instanceof Date) return Utilities.formatDate(val, "Asia/Seoul", "yyyy-MM-dd");
  var s = String(val).trim();
  if (s.indexOf("T") > -1) s = s.split("T")[0];
  return s.length >= 10 ? s.substring(0, 10) : s;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var column = e.range.getColumn();
    sheet.autoResizeColumn(column);
  } catch (err) {}
}
