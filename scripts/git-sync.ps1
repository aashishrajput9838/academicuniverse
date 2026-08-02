<#
.SYNOPSIS
    Automated Dual Git Synchronization Script for Academic Universe.
.DESCRIPTION
    Stages changes, commits, executes dual push to Primary and Mirror repositories,
    and performs post-push remote verification to guarantee commit hash parity.
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [string]$Message = "chore: dual repository sync update",

    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "         ACADEMIC UNIVERSE - AUTOMATED DUAL GIT SYNC           " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$PrimaryRepo = "https://github.com/aashishrajput9838/academicuniverse.git"
$MirrorRepo  = "https://github.com/aashishrajput98381/academicuniverse.git"

# 1. Stage Changes
Write-Host "[1/4] Staging files (git add .)..." -ForegroundColor Yellow
git add .

# 2. Commit Changes
$Status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($Status)) {
    Write-Host "[2/4] Working tree clean. Skipping commit." -ForegroundColor Gray
} else {
    Write-Host "[2/4] Committing with message: '$Message'..." -ForegroundColor Yellow
    git commit -m "$Message"
}

# 3. Dual Push to origin main
Write-Host "[3/4] Pushing changes to dual remotes (git push origin $Branch)..." -ForegroundColor Yellow
git push origin $Branch

# 4. Verify Remote Hash Alignment
Write-Host "[4/4] Verifying commit hash parity across remotes..." -ForegroundColor Yellow

$PrimaryHead = (git ls-remote $PrimaryRepo "refs/heads/$Branch" 2>$null)
$MirrorHead  = (git ls-remote $MirrorRepo "refs/heads/$Branch" 2>$null)

$PrimaryHash = if ($PrimaryHead) { $PrimaryHead.Split("`t")[0] } else { "UNKNOWN_PRIMARY" }
$MirrorHash  = if ($MirrorHead)  { $MirrorHead.Split("`t")[0]  } else { "UNKNOWN_MIRROR" }

Write-Host "  Primary Repo (Repo A) HEAD : $PrimaryHash" -ForegroundColor Gray
Write-Host "  Mirror Repo  (Repo B) HEAD : $MirrorHash"  -ForegroundColor Gray

Write-Host ""
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
if (($PrimaryHash -ne "UNKNOWN_PRIMARY") -and ($PrimaryHash -eq $MirrorHash)) {
    Write-Host "                       SYNC SUCCESSFUL                           " -ForegroundColor Green
    Write-Host "  Both Primary and Mirror repositories are identically aligned. " -ForegroundColor Green
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "                         SYNC FAILED                             " -ForegroundColor Red
    Write-Host "  Commit hash mismatch or remote connectivity failure detected! " -ForegroundColor Red
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    exit 1
}
