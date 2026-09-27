$ErrorActionPreference = "Stop"

$root = "D:\PharmaBI-Live-Desktop"
$file = Join-Path $root "src\components\WhatsAppPage.jsx"

Set-Location $root

$content = Get-Content $file -Raw -Encoding UTF8

$backup = "$file.backup-before-conversation-thread-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $file $backup -Force

function Join-Lines {
    param([string[]]$Lines)
    return ($Lines -join "`r`n")
}

# ============================================================
# 1. Conversation state
# ============================================================

$stateAnchor = Join-Lines @(
    '      const ['
    '          historyLoading,'
    '          setHistoryLoading'
    '      ] = useState(false);'
)

$stateInsert = Join-Lines @(
    ''
    '      const ['
    '          conversationPhone,'
    '          setConversationPhone'
    '      ] = useState("");'
    ''
    ''
    '      const ['
    '          conversationCustomerName,'
    '          setConversationCustomerName'
    '      ] = useState("");'
    ''
    ''
    '      const ['
    '          conversationBranchId,'
    '          setConversationBranchId'
    '      ] = useState(null);'
    ''
    ''
    '      const ['
    '          conversationMessages,'
    '          setConversationMessages'
    '      ] = useState([]);'
    ''
    ''
    '      const ['
    '          conversationLoading,'
    '          setConversationLoading'
    '      ] = useState(false);'
    ''
    ''
    '      const ['
    '          conversationDraft,'
    '          setConversationDraft'
    '      ] = useState("");'
)

if (-not $content.Contains($stateAnchor)) {
    Write-Host "STATE ANCHOR NOT FOUND" -ForegroundColor Red
}
else {
    $content = $content.Replace(
        $stateAnchor,
        $stateAnchor + $stateInsert
    )
    Write-Host "STATE ADDED" -ForegroundColor Green
}

# ============================================================
# 2. Open conversation
# ============================================================

$loadBranchesAnchor = Join-Lines @(
    '      useEffect('
    '          () => {'
    ''
    '              void loadBranches();'
)

$openConversation = Join-Lines @(
    ''
    ''
    '      const openConversation ='
    '          useCallback('
    '              async row => {'
    ''
    '                  const selectedPhone ='
    '                      String('
    '                          row?.recipient_phone ||'
    '                          row?.phone ||'
    '                          ""'
    '                      ).trim();'
    ''
    '                  if (!selectedPhone) {'
    '                      return;'
    '                  }'
    ''
    '                  const rawName ='
    '                      String('
    '                          row?.customer_name ||'
    '                          ""'
    '                      ).trim();'
    ''
    '                  const displayName ='
    '                      row?.is_unmatched ||'
    '                      !rawName ||'
    '                      /^\d+$/.test(rawName)'
    '                          ? "\u0639\u0645\u064a\u0644 \u062c\u062f\u064a\u062f"'
    '                          : rawName;'
    ''
    '                  const selectedBranchId ='
    '                      Number(row?.branch_id) > 0'
    '                          ? Number(row.branch_id)'
    '                          : (Number(branchId) > 0'
    '                              ? Number(branchId)'
    '                              : null);'
    ''
    '                  const selectedCustomerId ='
    '                      row?.customer_id !== null &&'
    '                      row?.customer_id !== undefined'
    '                          ? String(row.customer_id)'
    '                          : "";'
    ''
    '                  setConversationPhone(selectedPhone);'
    '                  setConversationCustomerName(displayName);'
    '                  setConversationBranchId(selectedBranchId);'
    '                  setConversationMessages([]);'
    '                  setConversationDraft("");'
    '                  setPhone(selectedPhone);'
    '                  setCustomerId(selectedCustomerId);'
    '                  setConversationLoading(true);'
    ''
    '                  try {'
    ''
    '                      const result ='
    '                          await window'
    '                              .pharmaBI'
    '                              ?.whatsapp'
    '                              ?.history?.({'
    '                                  phone: selectedPhone,'
    '                                  limit: 200'
    '                              });'
    ''
    '                      const rows ='
    '                          Array.isArray(result?.history)'
    '                              ? result.history'
    '                              : Array.isArray(result)'
    '                                  ? result'
    '                                  : [];'
    ''
    '                      setConversationMessages('
    '                          [...rows].reverse()'
    '                      );'
    ''
    '                  }'
    '                  catch (error) {'
    ''
    '                      console.error('
    '                          "[WhatsApp] Conversation load error:",'
    '                          error'
    '                      );'
    ''
    '                      setActionError('
    '                          error?.message ||'
    '                          "تعذر فتح المحادثة."'
    '                      );'
    ''
    '                  }'
    '                  finally {'
    ''
    '                      setConversationLoading(false);'
    ''
    '                  }'
    ''
    '              },'
    '              [branchId]'
    '          );'
)

if (-not $content.Contains($loadBranchesAnchor)) {
    Write-Host "LOAD BRANCHES ANCHOR NOT FOUND" -ForegroundColor Red
}
else {
    $content = $content.Replace(
        $loadBranchesAnchor,
        $openConversation + "`r`n`r`n" + $loadBranchesAnchor
    )
    Write-Host "OPEN CONVERSATION ADDED" -ForegroundColor Green
}

# ============================================================
# 3. Send reply inside conversation
# ============================================================

$initializeAnchor = '      async function initializeWhatsApp() {'

$sendConversation = Join-Lines @(
    '      async function sendConversationMessage() {'
    ''
    '          const messageText = conversationDraft.trim();'
    ''
    '          setActionError("");'
    ''
    '          if (!conversationPhone) {'
    '              setActionError("لا توجد محادثة محددة.");'
    '              return;'
    '          }'
    ''
    '          if (!messageText) {'
    '              setActionError("اكتب الرسالة أولاً.");'
    '              return;'
    '          }'
    ''
    '          try {'
    ''
    '              const result ='
    '                  await window'
    '                      .pharmaBI'
    '                      ?.whatsapp'
    '                      ?.send?.({'
    '                          phone: conversationPhone,'
    '                          message: messageText,'
    '                          type: "TEXT",'
    '                          customerId: customerId || null,'
    '                          branchId: conversationBranchId || branchId'
    '                      });'
    ''
    '              if (result?.success === false) {'
    '                  throw new Error('
    '                      result.error ||'
    '                      "فشل إرسال الرسالة."'
    '                  );'
    '              }'
    ''
    '              setConversationDraft("");'
    ''
    '              const historyResult ='
    '                  await window'
    '                      .pharmaBI'
    '                      ?.whatsapp'
    '                      ?.history?.({'
    '                          phone: conversationPhone,'
    '                          limit: 200'
    '                      });'
    ''
    '              const rows ='
    '                  Array.isArray(historyResult?.history)'
    '                      ? historyResult.history'
    '                      : Array.isArray(historyResult)'
    '                          ? historyResult'
    '                          : [];'
    ''
    '              setConversationMessages('
    '                  [...rows].reverse()'
    '              );'
    ''
    '              await loadHistory();'
    ''
    '              setActionMessage("تم إرسال الرسالة.");'
    ''
    '          }'
    '          catch (error) {'
    ''
    '              console.error('
    '                  "[WhatsApp] Conversation send error:",'
    '                  error'
    '              );'
    ''
    '              setActionError('
    '                  error?.message ||'
    '                  "تعذر إرسال الرسالة."'
    '              );'
    ''
    '          }'
    ''
    '      }'
    ''
    ''
)

if (-not $content.Contains($initializeAnchor)) {
    Write-Host "INITIALIZE ANCHOR NOT FOUND" -ForegroundColor Red
}
else {
    $content = $content.Replace(
        $initializeAnchor,
        $sendConversation + $initializeAnchor
    )
    Write-Host "SEND REPLY ADDED" -ForegroundColor Green
}

# ============================================================
# 4. Make history rows clickable
# ============================================================

$rowOld = Join-Lines @(
    '                                                          <tr'
    '                                                              key={'
    '                                                                  row.id ||'
    '                                                                      `${row.provider_message_id}-${row.created_at}`'
    '                                                              }'
    '                                                          >'
)

$rowNew = Join-Lines @(
    '                                                          <tr'
    '                                                              key={'
    '                                                                  row.id ||'
    '                                                                      `${row.provider_message_id}-${row.created_at}`'
    '                                                              }'
    '                                                              onClick={'
    '                                                                  () =>'
    '                                                                      void openConversation('
    '                                                                          row'
    '                                                                      )'
    '                                                              }'
    '                                                              style={{'
    '                                                                  cursor: "pointer"'
    '                                                              }}'
    '                                                          >'
)

if (-not $content.Contains($rowOld)) {
    Write-Host "ROW TARGET NOT FOUND" -ForegroundColor Red
}
else {
    $content = $content.Replace(
        $rowOld,
        $rowNew
    )
    Write-Host "ROWS MADE CLICKABLE" -ForegroundColor Green
}

# ============================================================
# 5. Conversation panel
# ============================================================

$historyAnchor = Join-Lines @(
    '                  {'
    '                      historyLoading'
    '                          ? ('
)

$panel = Join-Lines @(
    ''
    '                  {'
    '                      conversationPhone && ('
    ''
    '                          <div'
    '                              style={{'
    '                                  marginBottom: 18,'
    '                                  border: "1px solid rgba(56,189,248,0.22)",'
    '                                  borderRadius: 14,'
    '                                  background: "rgba(15,23,42,0.92)",'
    '                                  overflow: "hidden"'
    '                              }}'
    '                          >'
    ''
    '                              <div'
    '                                  style={{'
    '                                      display: "flex",'
    '                                      alignItems: "center",'
    '                                      justifyContent: "space-between",'
    '                                      padding: "14px 16px",'
    '                                      borderBottom: "1px solid rgba(148,163,184,0.12)"'
    '                                  }}'
    '                              >'
    '                                  <div>'
    '                                      <strong'
    '                                          style={{'
    '                                              display: "block",'
    '                                              color: "#f8fafc",'
    '                                              fontSize: 16'
    '                                          }}'
    '                                      >'
    '                                          {conversationCustomerName || "\u0639\u0645\u064a\u0644 \u062c\u062f\u064a\u062f"}'
    '                                      </strong>'
    '                                      <span'
    '                                          style={{'
    '                                              color: "#94a3b8",'
    '                                              fontSize: 12'
    '                                          }}'
    '                                      >'
    '                                          {conversationPhone}'
    '                                      </span>'
    '                                  </div>'
    ''
    '                                  <button'
    '                                      type="button"'
    '                                      onClick={() => {'
    '                                          setConversationPhone("");'
    '                                          setConversationMessages([]);'
    '                                          setConversationDraft("");'
    '                                      }}'
    '                                      style={{'
    '                                          border: "1px solid rgba(148,163,184,0.22)",'
    '                                          background: "rgba(148,163,184,0.08)",'
    '                                          color: "#e2e8f0",'
    '                                          padding: "8px 12px",'
    '                                          borderRadius: 9,'
    '                                          cursor: "pointer",'
    '                                          fontWeight: 700'
    '                                      }}'
    '                                  >'
    '                                      إغلاق'
    '                                  </button>'
    '                              </div>'
    ''
    '                              <div'
    '                                  style={{'
    '                                      padding: 16,'
    '                                      maxHeight: 380,'
    '                                      overflowY: "auto",'
    '                                      display: "flex",'
    '                                      flexDirection: "column",'
    '                                      gap: 10'
    '                                  }}'
    '                              >'
    ''
    '                                  {conversationLoading ? ('
    '                                      <div'
    '                                          style={{'
    '                                              padding: 24,'
    '                                              textAlign: "center",'
    '                                              color: "#94a3b8"'
    '                                          }}'
    '                                      >'
    '                                          جارٍ تحميل المحادثة...'
    '                                      </div>'
    '                                  ) : conversationMessages.length === 0 ? ('
    '                                      <div'
    '                                          style={{'
    '                                              padding: 24,'
    '                                              textAlign: "center",'
    '                                              color: "#94a3b8"'
    '                                          }}'
    '                                      >'
    '                                          لا توجد رسائل سابقة.'
    '                                      </div>'
    '                                  ) : ('
    '                                      conversationMessages.map(message => ('
    '                                          <div'
    '                                              key={'
    '                                                  message.id ||'
    '                                                  message.unmatched_message_id ||'
    '                                                  ((message.provider_message_id || "msg") + "-" + (message.created_at || ""))'
    '                                              }'
    '                                              style={{'
    '                                                  display: "flex",'
    '                                                  justifyContent:'
    '                                                      message.direction === "OUTBOUND"'
    '                                                          ? "flex-start"'
    '                                                          : "flex-end"'
    '                                              }}'
    '                                          >'
    '                                              <div'
    '                                                  style={{'
    '                                                      maxWidth: "78%",'
    '                                                      padding: "10px 12px",'
    '                                                      borderRadius: 12,'
    '                                                      background:'
    '                                                          message.direction === "OUTBOUND"'
    '                                                              ? "rgba(56,189,248,0.10)"'
    '                                                              : "rgba(251,191,36,0.10)",'
    '                                                      border: "1px solid rgba(148,163,184,0.14)"'
    '                                                  }}'
    '                                              >'
    '                                                  <div'
    '                                                      style={{'
    '                                                          fontSize: 11,'
    '                                                          color: "#94a3b8",'
    '                                                          marginBottom: 4,'
    '                                                          fontWeight: 700'
    '                                                      }}'
    '                                                  >'
    '                                                      {message.direction === "OUTBOUND" ? "أنت" : "العميل"}'
    '                                                  </div>'
    ''
    '                                                  <div'
    '                                                      style={{'
    '                                                          color: "#f8fafc",'
    '                                                          whiteSpace: "pre-wrap",'
    '                                                          lineHeight: 1.55'
    '                                                      }}'
    '                                                  >'
    '                                                      {message.body_text || "—"}'
    '                                                  </div>'
    ''
    '                                                  <div'
    '                                                      style={{'
    '                                                          marginTop: 6,'
    '                                                          fontSize: 10,'
    '                                                          color: "#64748b"'
    '                                                      }}'
    '                                                  >'
    '                                                      {formatDate(message.created_at)}'
    '                                                  </div>'
    '                                              </div>'
    '                                          </div>'
    '                                      ))'
    '                                  )}'
    ''
    '                              </div>'
    ''
    '                              <div'
    '                                  style={{'
    '                                      display: "flex",'
    '                                      gap: 10,'
    '                                      padding: 14,'
    '                                      borderTop: "1px solid rgba(148,163,184,0.12)"'
    '                                  }}'
    '                              >'
    '                                  <textarea'
    '                                      value={conversationDraft}'
    '                                      onChange={event =>'
    '                                          setConversationDraft(event.target.value)'
    '                                      }'
    '                                      placeholder="اكتب ردك على العميل..."'
    '                                      rows={3}'
    '                                      style={{'
    '                                          flex: 1,'
    '                                          resize: "vertical",'
    '                                          minHeight: 72,'
    '                                          padding: "11px 12px",'
    '                                          borderRadius: 10,'
    '                                          border: "1px solid rgba(148,163,184,0.22)",'
    '                                          background: "#0f172a",'
    '                                          color: "#f8fafc",'
    '                                          fontFamily: "inherit"'
    '                                      }}'
    '                                  />'
    ''
    '                                  <button'
    '                                      type="button"'
    '                                      onClick={() => void sendConversationMessage()}'
    '                                      style={{'
    '                                          alignSelf: "flex-end",'
    '                                          border: "none",'
    '                                          background: "#0ea5e9",'
    '                                          color: "#ffffff",'
    '                                          padding: "11px 18px",'
    '                                          borderRadius: 10,'
    '                                          fontWeight: 800,'
    '                                          cursor: "pointer"'
    '                                      }}'
    '                                  >'
    '                                      إرسال'
    '                                  </button>'
    '                              </div>'
    ''
    '                          </div>'
    ''
    '                      )'
    '                  }'
    ''
)

if (-not $content.Contains($historyAnchor)) {
    Write-Host "HISTORY RENDER ANCHOR NOT FOUND" -ForegroundColor Red
}
else {
    $content = $content.Replace(
        $historyAnchor,
        $panel + $historyAnchor
    )
    Write-Host "CONVERSATION PANEL ADDED" -ForegroundColor Green
}

# ============================================================
# Save
# ============================================================

[System.IO.File]::WriteAllText(
    $file,
    $content,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WHATSAPP CONVERSATION PATCH COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backup: $backup"
Write-Host ""

npm run build:renderer

Write-Host ""
Write-Host "BUILD EXIT CODE = $LASTEXITCODE"