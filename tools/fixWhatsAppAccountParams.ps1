$ErrorActionPreference = "Stop"

$path =
    "D:\PharmaBI-Live-Desktop\electron\pharmfly\customers\crm\whatsappService.js"

if (-not (Test-Path $path)) {
    throw "whatsappService.js not found."
}


$stamp =
    Get-Date -Format "yyyyMMdd-HHmmss"

Copy-Item `
    $path `
    "$path.backup-before-account-param-fix-$stamp" `
    -Force


$utf8 =
    [System.Text.UTF8Encoding]::new(
        $false,
        $true
    )

$text =
    [System.IO.File]::ReadAllText(
        $path,
        $utf8
    )


$old = @'
              .run(
                  normalizedBranchId,
                  name,
                  displayPhoneNumber || null,
                  status || null,
                  status || null,
                  existing.id
              );
'@

$new = @'
              .run(
                  name,
                  displayPhoneNumber || null,
                  status || null,
                  status || null,
                  existing.id
              );
'@


if (-not $text.Contains($old)) {
    throw "Target ensureWhatsAppAccount parameter block was not found."
}


$text =
    $text.Replace(
        $old,
        $new
    )


[System.IO.File]::WriteAllText(
    $path,
    $text,
    $utf8
)


$verify =
    [System.IO.File]::ReadAllText(
        $path,
        $utf8
    )


if (
    $verify.Contains(
        "normalizedBranchId,`r`n                  name"
    ) -or
    $verify.Contains(
        "normalizedBranchId,`n                  name"
    )
) {
    throw "Old extra parameter still exists."
}


Write-Host ""
Write-Host "WHATSAPP ACCOUNT PARAMETER FIX COMPLETE" -ForegroundColor Green
Write-Host "Extra SQLite parameter removed." -ForegroundColor Cyan
Write-Host "Global WhatsApp account remains branch_id = NULL." -ForegroundColor Cyan
Write-Host ""


npm run build:renderer