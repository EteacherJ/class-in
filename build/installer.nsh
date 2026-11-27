!macro customInit
  !ifndef BUILD_UNINSTALLER
    DetailPrint "Class in 실행 중인 프로세스 강제 종료 중..."
    nsExec::Exec 'taskkill /f /im "Class in.exe" /t'
    nsExec::Exec 'taskkill /f /im "electron.exe" /t'
    Sleep 1500
  !endif
!macroend

!macro customCheckAppRunning
  ; electron-builder 기본 'cannot be closed' 무한 루프 팝업을 차단하고 자동 강제 종료
  nsExec::Exec 'taskkill /f /im "Class in.exe" /t'
  Sleep 1000
!macroend

!macro customUnInstall
  DetailPrint "Class in 프로세스 종료 중..."
  nsExec::Exec 'taskkill /f /im "Class in.exe" /t'
  Sleep 1000
  ; 🧹 직접 제거할 때만 묻기 (자동 업데이트 · 조용한 제거 중에는 자료를 그대로 둬요)
  ${ifNot} ${isUpdated}
    IfSilent classin_keep_data 0
      MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "이 컴퓨터에 저장된 Class in 자료(학생 명단 · 설정 · 기록 · 판서 등)도 함께 지울까요?$\r$\n$\r$\n[예] 자료까지 모두 지워요 (되돌릴 수 없어요)$\r$\n[아니요] 자료는 남겨 두고 프로그램만 지워요 (다시 설치하면 그대로 이어져요)$\r$\n$\r$\n※ 지우기 전에 [환경설정 → 💾 지금 백업]으로 백업해 두면 안전해요." IDNO classin_keep_data
      DetailPrint "Class in 자료 폴더 지우는 중..."
      SetShellVarContext current
      RMDir /r "$APPDATA\Class in"
      RMDir /r "$LOCALAPPDATA\Class in"
      RMDir /r "$LOCALAPPDATA\class-in-updater"
    classin_keep_data:
  ${endIf}
!macroend
