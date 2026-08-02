<#
.SYNOPSIS
    Automated Dual Git Synchronization & Post-Push Audit Script for Academic Universe.
.DESCRIPTION
    Stages files, commits, executes dual push to Primary and Mirror repositories,
    verifies post-push commit hash parity across Local, Primary, and Mirror repositories,
    and logs all operations to logs/git-sync.log.
.PARAMETER Message
    Commit message for staged changes.
.PARAMETER Branch
    Target tracking branch (default: main).
.PARAMETER Verbose
    Enables verbose console output and telemetry logging.
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [string]$Message = "chore: dual repository sync update",

    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

$LogDir = Join-Path $PSScriptRoot "..\logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$LogFile = Join-Path $LogDir "git-sync.log"

$PrimaryRepo = "https://github.com/aashishrajput9838/academicuniverse.git"
$MirrorRepo  = "https://github.com/aashishrajput98381/academicuniverse.git"

function Log-SyncMessage {
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

Log-SyncMessage "Initiating Dual Git Synchronization Pipeline..."
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "         ACADEMIC UNIVERSE - AUTOMATED DUAL GIT SYNC v2.0      " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Stage Changes
Write-Host "[1/5] Staging files (git add .)..." -ForegroundColor Yellow
Log-SyncMessage "Staging changes via git add ."
git add .

# 2. Commit Changes
$Status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($Status)) {
    Write-Host "[2/5] Working tree clean. Skipping commit." -ForegroundColor Gray
    Log-SyncMessage "Working tree clean. Skipping git commit."
} else {
    Write-Host "[2/5] Committing with message: '$Message'..." -ForegroundColor Yellow
    Log-SyncMessage "Committing staged files: $Message"
    git commit -m "$Message"
}

# 3. Dual Push to origin main
Write-Host "[3/5] Pushing changes to dual remotes (git push origin $Branch)..." -ForegroundColor Yellow
Log-SyncMessage "Executing dual push to origin $Branch..."
git push origin $Branch

# 4. Resolve Local, Primary, and Mirror HEAD Hashes
Write-Host "[4/5] Resolving commit hashes across local and remote targets..." -ForegroundColor Yellow
$LocalHash   = (git rev-parse HEAD 2>$null).Trim()
$PrimaryHead = (git ls-remote $PrimaryRepo "refs/heads/$Branch" 2>$null)
$MirrorHead  = (git ls-remote $MirrorRepo "refs/heads/$Branch" 2>$null)

$PrimaryHash = if ($PrimaryHead) { $PrimaryHead.Split("`t")[0] } else { "UNKNOWN_PRIMARY" }
$MirrorHash  = if ($MirrorHead)  { $MirrorHead.Split("`t")[0]  } else { "UNKNOWN_MIRROR" }

Log-SyncMessage "Local HEAD Hash   : $LocalHash"
Log-SyncMessage "Primary HEAD Hash : $PrimaryHash"
Log-SyncMessage "Mirror HEAD Hash  : $MirrorHash"

Write-Host "  Local Repository HEAD      : $LocalHash"   -ForegroundColor Gray
Write-Host "  Primary Repo (Repo A) HEAD : $PrimaryHash" -ForegroundColor Gray
Write-Host "  Mirror Repo  (Repo B) HEAD : $MirrorHash"  -ForegroundColor Gray

# 5. Verify Hash Parity
Write-Host "[5/5] Performing parity verification (Local == Primary == Mirror)..." -ForegroundColor Yellow
$ParityMatch = ($LocalHash -eq $PrimaryHash) -and ($PrimaryHash -eq $MirrorHash)

Write-Host ""
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
if ($ParityMatch) {
    Write-Host "                       SYNC SUCCESSFUL                           " -ForegroundColor Green
    Write-Host "  Local, Primary, and Mirror repositories are identically synced! " -ForegroundColor Green
    Write-Host "  Log written to: $LogFile" -ForegroundColor Gray
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    Log-SyncMessage "SYNC SUCCESSFUL: All three commit hashes match ($LocalHash)."
    exit 0
} else {
    Write-Host "                         SYNC FAILED                             " -ForegroundColor Red
    Write-Host "  Commit hash divergence detected across repositories!           " -ForegroundColor Red
    Write-Host "  Log written to: $LogFile" -ForegroundColor Gray
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    Log-SyncMessage "SYNC FAILED: Mismatch detected (Local: $LocalHash, Primary: $PrimaryHash, Mirror: $MirrorHash)."
    exit 1
}
