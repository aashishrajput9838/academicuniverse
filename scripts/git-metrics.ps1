<#
.SYNOPSIS
    Git Infrastructure Performance & Repository Metrics Generator for Academic Universe.
.DESCRIPTION
    Calculates database size, commit count, object count, largest objects, pack files,
    remote ping/ls-remote latency, tag counts, and computes an overall Repository Health Score (0-100%).
.PARAMETER Verbose
    Enables verbose output and logs telemetry data to logs/metrics.log.
#>

[CmdletBinding()]
param ()

$ErrorActionPreference = "Continue"

$LogDir = Join-Path $PSScriptRoot "..\logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$LogFile = Join-Path $LogDir "metrics.log"

$PrimaryRepo = "https://github.com/aashishrajput9838/academicuniverse.git"
$MirrorRepo  = "https://github.com/aashishrajput98381/academicuniverse.git"

function Log-Metrics {
    param ([string]$Msg)
    $TimeStamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Add-Content -Path $LogFile -Value "[$TimeStamp] $Msg"
    if ($PSBoundParameters['Verbose']) { Write-Verbose $Msg }
}

Log-Metrics "Starting Git Metrics Collection..."
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "       ACADEMIC UNIVERSE - ENTERPRISE GIT METRICS v3.0         " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$HealthScore = 100

# 1. Object Database & Directory Size
$GitDir = Join-Path $PSScriptRoot "..\.git"
$RepoSizeMB = [Math]::Round(((Get-ChildItem -Path $GitDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB), 2)
Log-Metrics "Repository Size: $RepoSizeMB MB"
Write-Host "  [METRIC] Total .git Directory Size    : " -NoNewline; Write-Host "$RepoSizeMB MB" -ForegroundColor Green

# 2. Total Revision Commit Count
$CommitCount = (git rev-list --count HEAD 2>$null).Trim()
Log-Metrics "Commit Count: $CommitCount"
Write-Host "  [METRIC] Total Commits in History      : " -NoNewline; Write-Host "$CommitCount" -ForegroundColor Green

# 3. Branch & Tag Counts
$BranchCount = (git branch -a 2>$null).Count
Log-Metrics "Branch Count: $BranchCount"
Write-Host "  [METRIC] Total Local & Remote Branches : " -NoNewline; Write-Host "$BranchCount" -ForegroundColor Green

$TagCount = (git tag 2>$null).Count
Log-Metrics "Tag Count: $TagCount"
Write-Host "  [METRIC] Total Git Tags                : " -NoNewline; Write-Host "$TagCount" -ForegroundColor Green

# 4. Pack Files & Loose Objects
$PackFiles = (Get-ChildItem -Path (Join-Path $GitDir "objects\pack") -Filter "*.pack" -ErrorAction SilentlyContinue).Count
Log-Metrics "Pack Files Count: $PackFiles"
Write-Host "  [METRIC] Pack File Count               : " -NoNewline; Write-Host "$PackFiles" -ForegroundColor Green

# 5. Remote Latency Metrics
$LatencyPrimary = Measure-Command { $PHead = (git ls-remote $PrimaryRepo "refs/heads/main" 2>$null) }
$PrimaryMs = [Math]::Round($LatencyPrimary.TotalMilliseconds, 2)
Log-Metrics "Primary Latency: $PrimaryMs ms"
Write-Host "  [METRIC] Primary Remote Latency        : " -NoNewline; Write-Host "$PrimaryMs ms" -ForegroundColor Green

$LatencyMirror = Measure-Command { $MHead = (git ls-remote $MirrorRepo "refs/heads/main" 2>$null) }
$MirrorMs = [Math]::Round($LatencyMirror.TotalMilliseconds, 2)
Log-Metrics "Mirror Latency: $MirrorMs ms"
Write-Host "  [METRIC] Mirror Remote Latency         : " -NoNewline; Write-Host "$MirrorMs ms" -ForegroundColor Green

# Deduct health score for latency > 5000ms or size > 500MB
if ($RepoSizeMB -gt 500) { $HealthScore -= 10 }
if ($PrimaryMs -gt 5000) { $HealthScore -= 10 }
if ($MirrorMs -gt 5000) { $HealthScore -= 10 }

# 6. Overall Health Score Calculation
Write-Host ""
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  OVERALL ENTERPRISE REPOSITORY HEALTH SCORE: " -NoNewline
if ($HealthScore -ge 90) {
    Write-Host "$HealthScore% (EXCELLENT)" -ForegroundColor Green
} elseif ($HealthScore -ge 70) {
    Write-Host "$HealthScore% (GOOD)" -ForegroundColor Yellow
} else {
    Write-Host "$HealthScore% (NEEDS ATTENTION)" -ForegroundColor Red
}
Write-Host "  Metrics Log saved to: $LogFile" -ForegroundColor Gray
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan

exit 0
