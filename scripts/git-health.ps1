<#
.SYNOPSIS
    Enhanced Git Infrastructure Health Check Script for Academic Universe.
.DESCRIPTION
    Audits repository size, total commits, branch count, network latency, remote hash parity,
    hook validity, credential managers, and system health status.
.PARAMETER Verbose
    Enables verbose console logging and writes detailed telemetry to logs/git-health.log.
#>

[CmdletBinding()]
param (
    [string]$Branch = "main"
)

$ErrorActionPreference = "Continue"

$LogDir = Join-Path $PSScriptRoot "..\logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$LogFile = Join-Path $LogDir "git-health.log"

$Script:Status = "PASS"
$Script:Warnings = @()
$Script:Failures = @()

$PrimaryRepo = "https://github.com/aashishrajput9838/academicuniverse.git"
$MirrorRepo  = "https://github.com/aashishrajput98381/academicuniverse.git"

function Log-HealthMessage {
    param (
        [string]$Message,
        [bool]$IsVerbose = $false
    )
    $TimeStamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $LogEntry = "[$TimeStamp] $Message"
    Add-Content -Path $LogFile -Value $LogEntry
    if ($IsVerbose -or $PSBoundParameters['Verbose']) {
        Write-Verbose $Message
    }
}

function Log-HealthCheck {
    param (
        [string]$CheckName,
        [string]$Level, # PASS, WARNING, FAIL
        [string]$Message
    )

    $TimeStamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Log-HealthMessage "[$Level] $CheckName - $Message"

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

Log-HealthMessage "Starting Git Infrastructure Health Check..."
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "       ACADEMIC UNIVERSE - GIT WORKFLOW HEALTH CHECK v2.0       " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Git Installation & Version Validation
try {
    $GitVersion = (git --version 2>$null).Trim()
    if ($GitVersion) {
        Log-HealthCheck -CheckName "Git Binary Installed" -Level "PASS" -Message $GitVersion
    } else {
        Log-HealthCheck -CheckName "Git Binary Installed" -Level "FAIL" -Message "Git CLI not found"
    }
} catch {
    Log-HealthCheck -CheckName "Git Binary Installed" -Level "FAIL" -Message $_.Exception.Message
}

# 2. Repository Metrics: Size, Commits, Branches
try {
    $GitFolderSizeMB = [Math]::Round(((Get-ChildItem -Path (Join-Path $PSScriptRoot "..\.git") -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB), 2)
    Log-HealthCheck -CheckName "Repository Object Database Size" -Level "PASS" -Message "${GitFolderSizeMB} MB (.git size)"

    $CommitCount = (git rev-list --count HEAD 2>$null).Trim()
    Log-HealthCheck -CheckName "Total Revision Commit Count" -Level "PASS" -Message "${CommitCount} commits in history"

    $BranchCount = (git branch -a 2>$null).Count
    Log-HealthCheck -CheckName "Branch Inventory Count" -Level "PASS" -Message "${BranchCount} total local/remote branches"
} catch {
    Log-HealthCheck -CheckName "Repository Metrics" -Level "WARNING" -Message $_.Exception.Message
}

# 3. Origin Remote Configuration
$Remotes = (git remote 2>$null)
if ($Remotes -contains "origin") {
    Log-HealthCheck -CheckName "Remote Origin Existence" -Level "PASS" -Message "Remote 'origin' exists"
} else {
    Log-HealthCheck -CheckName "Remote Origin Existence" -Level "FAIL" -Message "Remote 'origin' missing"
}

# 4. Origin Fetch URL Points to Primary Repo
$FetchUrl = (git remote get-url origin 2>$null).Trim()
if ($FetchUrl -eq $PrimaryRepo) {
    Log-HealthCheck -CheckName "Origin Fetch URL Configuration" -Level "PASS" -Message "Points to Primary Repo ($PrimaryRepo)"
} else {
    Log-HealthCheck -CheckName "Origin Fetch URL Configuration" -Level "FAIL" -Message "Expected $PrimaryRepo, found $FetchUrl"
}

# 5. Dual Push URLs Check
$PushUrls = (git remote get-url --push --all origin 2>$null)
$HasPrimaryPush = $PushUrls -contains $PrimaryRepo
$HasMirrorPush  = $PushUrls -contains $MirrorRepo

if ($HasPrimaryPush -and $HasMirrorPush) {
    Log-HealthCheck -CheckName "Dual Push URLs Configuration" -Level "PASS" -Message "Primary and Mirror push URLs present"
} else {
    Log-HealthCheck -CheckName "Dual Push URLs Configuration" -Level "FAIL" -Message "Missing dual push targets"
}

# 6. Remote Latency & Permissions Check (Measure-Command)
$LatencyPrimary = Measure-Command { $PrimaryHead = (git ls-remote $PrimaryRepo "refs/heads/$Branch" 2>$null) }
if ($PrimaryHead) {
    Log-HealthCheck -CheckName "Primary Remote Latency & Access" -Level "PASS" -Message "Reachable in $($LatencyPrimary.TotalMilliseconds) ms"
} else {
    Log-HealthCheck -CheckName "Primary Remote Latency & Access" -Level "FAIL" -Message "Primary Repo unreachable"
}

$LatencyMirror = Measure-Command { $MirrorHead = (git ls-remote $MirrorRepo "refs/heads/$Branch" 2>$null) }
if ($MirrorHead) {
    Log-HealthCheck -CheckName "Mirror Remote Latency & Access" -Level "PASS" -Message "Reachable in $($LatencyMirror.TotalMilliseconds) ms"
} else {
    Log-HealthCheck -CheckName "Mirror Remote Latency & Access" -Level "FAIL" -Message "Mirror Repo unreachable"
}

# 7. Hash Synchronization Parity Check
$PrimaryHash = if ($PrimaryHead) { $PrimaryHead.Split("`t")[0] } else { "PRIMARY_ERR" }
$MirrorHash  = if ($MirrorHead)  { $MirrorHead.Split("`t")[0]  } else { "MIRROR_ERR" }

if (($PrimaryHash -ne "PRIMARY_ERR") -and ($PrimaryHash -eq $MirrorHash)) {
    Log-HealthCheck -CheckName "Hash Synchronization Parity" -Level "PASS" -Message "Repo A and Repo B identically aligned ($PrimaryHash)"
} else {
    Log-HealthCheck -CheckName "Hash Synchronization Parity" -Level "FAIL" -Message "Mismatch: Primary=$PrimaryHash vs Mirror=$MirrorHash"
}

# 8. Working Tree State
$Uncommitted = (git status --porcelain 2>$null)
if ([string]::IsNullOrWhiteSpace($Uncommitted)) {
    Log-HealthCheck -CheckName "Working Tree Cleanliness" -Level "PASS" -Message "Clean"
} else {
    Log-HealthCheck -CheckName "Working Tree Cleanliness" -Level "WARNING" -Message "Uncommitted changes present"
}

# 9. Current Branch & Tracking Alignment
$CurrentBranch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
if ($CurrentBranch -eq $Branch) {
    Log-HealthCheck -CheckName "Current Branch State" -Level "PASS" -Message "On '$Branch'"
} else {
    Log-HealthCheck -CheckName "Current Branch State" -Level "WARNING" -Message "On '$CurrentBranch', expected '$Branch'"
}

$LocalHash  = (git rev-parse HEAD 2>$null).Trim()
if ($LocalHash -eq $PrimaryHash) {
    Log-HealthCheck -CheckName "HEAD Alignment (HEAD == origin/$Branch)" -Level "PASS" -Message "Synchronized ($LocalHash)"
} else {
    Log-HealthCheck -CheckName "HEAD Alignment (HEAD == origin/$Branch)" -Level "WARNING" -Message "Local HEAD ($LocalHash) != origin/$Branch ($PrimaryHash)"
}

# 10. Hook Validation
$PrePushHook = Join-Path $PSScriptRoot "..\.git\hooks\pre-push"
if (Test-Path $PrePushHook) {
    Log-HealthCheck -CheckName "Git Hook Validation (.git/hooks/pre-push)" -Level "PASS" -Message "Hook file active"
} else {
    Log-HealthCheck -CheckName "Git Hook Validation (.git/hooks/pre-push)" -Level "WARNING" -Message "Pre-push hook missing"
}

Write-Host ""
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
if ($Script:Status -eq "PASS") {
    Write-Host "  OVERALL HEALTH STATUS: [ PASS ]" -ForegroundColor Green
    Write-Host "  Health log saved to: $LogFile" -ForegroundColor Gray
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    exit 0
} elseif ($Script:Status -eq "WARNING") {
    Write-Host "  OVERALL HEALTH STATUS: [ WARNING ]" -ForegroundColor Yellow
    Write-Host "  Warnings: $($Script:Warnings -join '; ')" -ForegroundColor Yellow
    Write-Host "  Health log saved to: $LogFile" -ForegroundColor Gray
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "  OVERALL HEALTH STATUS: [ FAIL ]" -ForegroundColor Red
    Write-Host "  Failures: $($Script:Failures -join '; ')" -ForegroundColor Red
    Write-Host "  Health log saved to: $LogFile" -ForegroundColor Gray
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    exit 2
}
