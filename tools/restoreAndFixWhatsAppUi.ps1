$ErrorActionPreference = "Stop"

$root = "D:\PharmaBI-Live-Desktop"

$target =
    Join-Path `
        $root `
        "src\components\WhatsAppPage.jsx"

$cleanBackup =
    "D:\PharmaBI-WhatsApp-Rebuild-Backup-20260927-011656\WhatsAppPage.jsx"

if (-not (Test-Path $cleanBackup)) {
    throw "Clean WhatsAppPage backup not found: $cleanBackup"
}

if (-not (Test-Path $target)) {
    throw "Current WhatsAppPage.jsx not found: $target"
}


# ============================================================
# 1. BACKUP CURRENT FILE
# ============================================================

$stamp =
    Get-Date -Format "yyyyMMdd-HHmmss"

Copy-Item `
    $target `
    "$target.backup-before-encoding-fix-$stamp" `
    -Force


# ============================================================
# 2. RESTORE CLEAN UTF-8 VERSION
# ============================================================

Copy-Item `
    $cleanBackup `
    $target `
    -Force

Write-Host "Clean WhatsAppPage.jsx restored." -ForegroundColor Green


# ============================================================
# 3. READ AS REAL UTF-8
# ============================================================

$utf8Read =
    [System.Text.UTF8Encoding]::new(
        $false,
        $true
    )

$text =
    [System.IO.File]::ReadAllText(
        $target,
        $utf8Read
    )


# ============================================================
# 4. ADD REAL-TIME MESSAGE LISTENER
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
    -not $text.Contains(
        "?.onMessage?.("
    )
) {

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
else {

    Write-Host "Message listener already exists." -ForegroundColor Yellow

}


# ============================================================
# 5. SHOW CUSTOMER NAME + PHONE IN HISTORY
# ============================================================

$pattern =
    '(?s)\{\s*row\.recipient_phone\s*\|\|\s*row\.phone\s*\|\|\s*["''][^"'']*["'']\s*\}'

$replacement = @'
<div
    style={{
        display: "flex",
        flexDirection: "column",
        gap: 3
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
            color: "#94a3b8",
            fontSize: 12
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

$regex =
    [regex]::new(
        $pattern,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

$match =
    $regex.Match(
        $text
    )

if (
    $match.Success
) {

    $text =
        $text.Substring(
            0,
            $match.Index
        ) +
        $replacement +
        $text.Substring(
            $match.Index +
            $match.Length
        )

    Write-Host "Customer name display added." -ForegroundColor Green

}
else {

    Write-Host "Customer phone expression not found." -ForegroundColor Yellow

}


# ============================================================
# 6. WRITE AS UTF-8 WITHOUT MOJIBAKE
# ============================================================

$utf8Write =
    [System.Text.UTF8Encoding]::new(
        $false
    )

[System.IO.File]::WriteAllText(
    $target,
    $text,
    $utf8Write
)


# ============================================================
# 7. VERIFY ENCODING
# ============================================================

$verify =
    [System.IO.File]::ReadAllText(
        $target,
        $utf8Read
    )

if (
    $verify -match "طھظ|ط§ط|ظٹظ|ظ…ط|ظˆط"
) {

    throw "Encoding verification failed: mojibake detected."

}

if (
    $verify -notmatch "onMessage"
) {

    throw "Verification failed: onMessage."

}

if (
    $verify -notmatch "offMessage"
) {

    throw "Verification failed: offMessage."

}

if (
    $verify -notmatch "customer_name"
) {

    throw "Verification failed: customer_name."

}

if (
    $verify -notmatch "is_unmatched"
) {

    throw "Verification failed: is_unmatched."

}


Write-Host ""
Write-Host "UI encoding restored successfully." -ForegroundColor Green
Write-Host "WhatsApp real-time listener = ENABLED" -ForegroundColor Cyan
Write-Host "Customer name display = ENABLED" -ForegroundColor Cyan
Write-Host "Arabic mojibake = NOT DETECTED" -ForegroundColor Green
Write-Host ""


# ============================================================
# 8. BUILD
# ============================================================

npm run build:renderer