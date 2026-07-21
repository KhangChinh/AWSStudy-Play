!macro customInit
  ; Check if app is already installed by reading the uninstall registry key
  ReadRegStr $0 SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "QuietUninstallString"
  ${If} $0 != ""
    ; Run the existing uninstaller silently before proceeding
    ExecWait '$0 --force-run'
  ${EndIf}
!macroend
