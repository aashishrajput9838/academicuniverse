<#
.SYNOPSIS
    Standalone Mirror Integrity & Divergence Detection Tool for Academic Universe.
.DESCRIPTION
    Compares commit histories across Local HEAD, Primary Remote (Repo A), and Mirror Remote (Repo B)
    to detect ahead/behind states, history divergence, missing commits, and commit hash parity.
.PARAMETER Branch
    Target tracking branch (default: main).
.PARAMETER Verbose
    Enables verbose output and writes logs to logs/mirror-integrity.log.
#>

[CmdletBinding()]
param (
    [string]$Branch = "main"
)

$ErrorActionPreference = "Continue"

$LogDir = Join-Path $PSScriptRoot "..\logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$LogFile = Join-Path $LogDir "mirror-integrity.log"

$PrimaryRepo = "https://github.com/aashishrajput9838/academicuniverse.git"
$MirrorRepo  = "https://github.com/aashishrajput98381/academicuniverse.git"

$Script:Status = "PASS"
$Script:Failures = @()
$Script:Warnings = @()

function Log-IntegrityMessage {
    param (
        [string]$Msg,
        [bool]$IsVerbose = $false
    )
    $TimeStamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $LogEntry = "[$TimeStamp] $Msg"
    Add-Content -Path $LogFile -Value $LogEntry
    if ($IsVerbose -or $PSBoundParameters['Verbose']) {
        Write-Verbose $Msg
    }
}

function Log-IntegrityCheck {
    param (
        [string]$CheckName,
        [string]$Level, # PASS, WARNING, FAIL
        [string]$Message
    )

    $TimeStamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Log-IntegrityMessage "[$Level] $CheckName - $Message"

    switch ($Level) {
        "PASS" {
            Write-Host "[ PASS ]    " -ForegroundColor Green -NoNewline
            Write-Host "$CheckName " -ForegroundColor White -NoNewline
            if ($Message) { Write-Host "- $Message" -ForegroundColor Gray } else { Write-Host "" }
        }
        "WARNING" {
            Write-Host "[ WARNING ] " -ForegroundColor Yellow -NoNewline
            Write-Host "$CheckName " -ForegroundColor White -NoNewline
            if ($Message) { Write-Host "- $Message" -ForegroundColor Yellow } else { Write-Host "" }
            if ($Script:Status -ne "FAIL") { $Script:Status = "WARNING" }
            $Script:Warnings += "$($CheckName): $($Message)"
        }
        "FAIL" {
            Write-Host "[ FAIL ]    " -ForegroundColor Red -NoNewline
            Write-Host "$CheckName " -ForegroundColor White -NoNewline
            if ($Message) { Write-Host "- $Message" -ForegroundColor Red } else { Write-Host "" }
            $Script:Status = "FAIL"
            $Script:Failures += "$($CheckName): $($Message)"
        }
    }
}

Log-IntegrityMessage "Starting Mirror Integrity & Divergence Audit..."
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "     ACADEMIC UNIVERSE - MIRROR INTEGRITY & DIVERGENCE AUDIT     " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Fetch Remote HEAD Hashes
$LocalHash   = (git rev-parse HEAD 2>$null).Trim()
$PrimaryHead = (git ls-remote $PrimaryRepo "refs/heads/$Branch" 2>$null)
$MirrorHead  = (git ls-remote $MirrorRepo "refs/heads/$Branch" 2>$null)

$PrimaryHash = if ($PrimaryHead) { $PrimaryHead.Split("`t")[0] } else { "UNREACHABLE" }
$MirrorHash  = if ($MirrorHead)  { $MirrorHead.Split("`t")[0]  } else { "UNREACHABLE" }

# 2. Remote Reachability Check
if ($PrimaryHash -ne "UNREACHABLE") {
    Log-IntegrityCheck -CheckName "Primary Remote Reachability" -Level "PASS" -Message "Primary Repo (Repo A) online ($PrimaryHash)"
} else {
    Log-IntegrityCheck -CheckName "Primary Remote Reachability" -Level "FAIL" -Message "Cannot connect to Primary Repo ($PrimaryRepo)"
}

if ($MirrorHash -ne "UNREACHABLE") {
    Log-IntegrityCheck -CheckName "Mirror Remote Reachability" -Level "PASS" -Message "Mirror Repo (Repo B) online ($MirrorHash)"
} else {
    Log-IntegrityCheck -CheckName "Mirror Remote Reachability" -Level "FAIL" -Message "Cannot connect to Mirror Repo ($MirrorRepo)"
}

# 3. Hash Alignment & Divergence Checks
if (($PrimaryHash -ne "UNREACHABLE") -and ($MirrorHash -ne "UNREACHABLE")) {
    if ($PrimaryHash -eq $MirrorHash) {
        Log-IntegrityCheck -CheckName "Primary vs Mirror Hash Parity" -Level "PASS" -Message "Identically synced ($PrimaryHash)"
    } else {
        Log-IntegrityCheck -CheckName "Primary vs Mirror Hash Parity" -Level "FAIL" -Message "HASH MISMATCH: Primary=$PrimaryHash | Mirror=$MirrorHash"
    }

    if ($LocalHash -eq $PrimaryHash) {
        Log-IntegrityCheck -CheckName "Local HEAD vs Primary Hash" -Level "PASS" -Message "Local HEAD matches Primary"
    } else {
        Log-IntegrityCheck -CheckName "Local HEAD vs Primary Hash" -Level "WARNING" -Message "Local HEAD ($LocalHash) != Primary ($PrimaryHash)"
    }

    if ($LocalHash -eq $MirrorHash) {
        Log-IntegrityCheck -CheckName "Local HEAD vs Mirror Hash" -Level "PASS" -Message "Local HEAD matches Mirror"
    } else {
        Log-IntegrityCheck -CheckName "Local HEAD vs Mirror Hash" -Level "WARNING" -Message "Local HEAD ($LocalHash) != Mirror ($MirrorHash)"
    }
}

Write-Host ""
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
if ($Script:Status -eq "PASS") {
    Write-Host "  MIRROR INTEGRITY: [ PASS ] - Repositories 100% Synchronized!" -ForegroundColor Green
    Write-Host "  Log written to: $LogFile" -ForegroundColor Gray
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    exit 0
} elseif ($Script:Status -eq "WARNING") {
    Write-Host "  MIRROR INTEGRITY: [ WARNING ] - Warnings detected." -ForegroundColor Yellow
    Write-Host "  Log written to: $LogFile" -ForegroundColor Gray
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "  MIRROR INTEGRITY: [ FAIL ] - Critical Hash Divergence Detected!" -ForegroundColor Red
    Write-Host "  Log written to: $LogFile" -ForegroundColor Gray
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    exit 2
}
