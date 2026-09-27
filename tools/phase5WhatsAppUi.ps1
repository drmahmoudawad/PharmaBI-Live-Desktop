$ErrorActionPreference = "Stop"

$root = "D:\PharmaBI-Live-Desktop"

$path = Join-Path `
    $root `
    "src\components\WhatsAppPage.jsx"

if (-not (Test-Path $path)) {
    throw "WhatsAppPage.jsx not found."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

Copy-Item `
    $path `
    "$path.backup-phase5-$stamp" `
    -Force

$text = Get-Content `
    $path `
    -Raw


# ============================================================
# 1. ADD REAL-TIME WHATSAPP MESSAGE LISTENER
# ============================================================

$historyEffect = @'
    useEffect(
        () => {

            void loadHistory();

        },
        [
            loadHistory
        ]
    );

'@

$messageEffect = @'
    useEffect(
        () => {

            const messageHandler =
                (
                    first,
                    second
                ) => {

                    const payload =
                        getEventPayload(
                            first,
                            second
                        );

                    if (
                        payload &&
                        typeof payload === "object"
                    ) {

                        void loadHistory();

                    }

                };


            try {

                window
                    .pharmaBI
                    ?.whatsapp
                    ?.onMessage?.(
                        messageHandler
                    );

            }
            catch (
                error
            ) {

                console.warn(
                    "[WhatsApp] Message listener setup failed:",
                    error
                );

            }


            return () => {

                try {

                    window
                        .pharmaBI
                        ?.whatsapp
                        ?.offMessage?.(
                            messageHandler
                        );

                }
                catch {
                    // Optional cleanup.
                }

            };

        },
        [
            loadHistory
        ]
    );

'@

if (
    $text.Contains(
        "?.whatsapp?.onMessage"
    ) -or
    $text.Contains(
        "?.whatsapp`r`n                    ?.onMessage"
    )
) {

    Write-Host "Message listener already exists." -ForegroundColor Yellow

}
else {

    if (
        -not $text.Contains(
            $historyEffect
        )
    ) {

        throw "Could not locate history useEffect."

    }

    $text =
        $text.Replace(
            $historyEffect,
            $historyEffect +
            $messageEffect
        )

    Write-Host "Real-time message listener added." -ForegroundColor Green

}


# ============================================================
# 2. SHOW CUSTOMER NAME + PHONE IN HISTORY
# ============================================================

$oldPhoneExpression = @'
                                                                {
                                                                    row.recipient_phone ||
                                                                    row.phone ||
                                                                    "â€”"
                                                                }
'@

$newPhoneExpression = @'
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        flexDirection:
                                                                            "column",
                                                                        gap:
                                                                            3
                                                                    }}
                                                                >

                                                                    <strong
                                                                        style={{
                                                                            color:
                                                                                row.is_unmatched
                                                                                    ? "#fbbf24"
                                                                                    : "#f8fafc"
                                                                        }}
                                                                    >
                                                                        {
                                                                            row.customer_name ||
                                                                            (
                                                                                row.is_unmatched
                                                                                    ? "\u0639\u0645\u064a\u0644 \u062c\u062f\u064a\u062f"
                                                                                    : "—"
                                                                            )
                                                                        }
                                                                    </strong>

                                                                    <span
                                                                        style={{
                                                                            color:
                                                                                "#94a3b8",
                                                                            fontSize:
                                                                                12
                                                                        }}
                                                                    >
                                                                        {
                                                                            row.recipient_phone ||
                                                                            row.phone ||
                                                                            "—"
                                                                        }
                                                                    </span>

                                                                </div>
'@

if (
    $text.Contains(
        $oldPhoneExpression
    )
) {

    $text =
        $text.Replace(
            $oldPhoneExpression,
            $newPhoneExpression
        )

    Write-Host "Customer name display updated." -ForegroundColor Green

}
else {

    Write-Host "Phone display expression not found; leaving it unchanged." -ForegroundColor Yellow

}


# ============================================================
# 3. ADD A NEW-CUSTOMER INDICATOR TO THE DIRECTION CELL
# ============================================================

$oldDirectionExpression = @'
                                                                {
                                                                    row.direction ===
                                                                    "INBOUND"
                                                                        ? "ظˆط§ط±ط¯"
                                                                        : "طµط§ط¯ط±"
                                                                }
'@

$newDirectionExpression = @'
                                                                {
                                                                    row.is_unmatched
                                                                        ? "\u0639\u0645\u064a\u0644 \u062c\u062f\u064a\u062f"
                                                                        : (
                                                                            row.direction ===
                                                                            "INBOUND"
                                                                                ? "\u0648\u0627\u0631\u062f"
                                                                                : "\u0635\u0627\u062f\u0631"
                                                                        )
                                                                }
'@

if (
    $text.Contains(
        $oldDirectionExpression
    )
) {

    $text =
        $text.Replace(
            $oldDirectionExpression,
            $newDirectionExpression
        )

    Write-Host "NEW customer indicator added." -ForegroundColor Green

}
else {

    Write-Host "Direction expression not found; leaving it unchanged." -ForegroundColor Yellow

}


# ============================================================
# 4. SAVE
# ============================================================

Set-Content `
    -Path $path `
    -Value $text `
    -Encoding UTF8


# ============================================================
# 5. VERIFY
# ============================================================

$check =
    Get-Content `
        $path `
        -Raw

if (
    $check -notmatch 'onMessage'
) {

    throw "Verification failed: onMessage listener."

}

if (
    $check -notmatch 'offMessage'
) {

    throw "Verification failed: offMessage cleanup."

}

if (
    $check -notmatch 'row\.customer_name'
) {

    throw "Verification failed: customer_name display."

}

if (
    $check -notmatch 'is_unmatched'
) {

    throw "Verification failed: unmatched customer display."

}


Write-Host ""
Write-Host "PHASE 5 COMPLETE" -ForegroundColor Green
Write-Host "Real-time inbound refresh = ENABLED" -ForegroundColor Cyan
Write-Host "Customer name = DISPLAYED" -ForegroundColor Cyan
Write-Host "NEW CUSTOMER indicator = ENABLED" -ForegroundColor Cyan
Write-Host ""

node --check $path