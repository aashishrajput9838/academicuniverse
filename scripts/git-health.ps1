<#
.SYNOPSIS
    Git Workflow Health Check Script for Academic Universe.
.DESCRIPTION
    Comprehensive health check script verifying CLI environment, git configuration,
    push URLs, remote connectivity, working tree state, and HEAD alignment.
#>

[CmdletBinding()]
param (
    [string]$Branch = "main"
)

$ErrorActionPreference = "Continue"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "       ACADEMIC UNIVERSE - GIT WORKFLOW HEALTH CHECK           " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$PrimaryRepo = "https://github.com/aashishrajput9838/academicuniverse.git"
$MirrorRepo  = "https://github.com/aashishrajput98381/academicuniverse.git"

$Status = "PASS"
$Warnings = @()
$Failures = @()

function Log-HealthCheck {
    param (
        [string]$CheckName,
        [string]$Level, # PASS, WARNING, FAIL
        [string]$Message
    )

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
            if ($script:Status -ne "FAIL") { $script:Status = "WARNING" }
            $script:Warnings += "$($CheckName): $($Message)"
        }
        "FAIL" {
            Write-Host "[ FAIL ]    " -ForegroundColor Red -NoNewline
            Write-Host "$CheckName " -ForegroundColor White -NoNewline
            if ($Message) { Write-Host "- $Message" -ForegroundColor Red } else { Write-Host "" }
            $script:Status = "FAIL"
            $script:Failures += "$($CheckName): $($Message)"
        }
    }
}

# 1. Check Git Installation
try {
    $GitVersion = (git --version 2>$null).Trim()
    if ($GitVersion) {
        Log-HealthCheck -CheckName "Git Binary Installed" -Level "PASS" -Message $GitVersion
    } else {
        Log-HealthCheck -CheckName "Git Binary Installed" -Level "FAIL" -Message "Git CLI is not installed or not found in PATH"
    }
} catch {
    Log-HealthCheck -CheckName "Git Binary Installed" -Level "FAIL" -Message $_.Exception.Message
}

# 2. Check Remote Configuration
$Remotes = (git remote 2>$null)
if ($Remotes -contains "origin") {
    Log-HealthCheck -CheckName "Remote Origin Configured" -Level "PASS" -Message "Remote 'origin' exists"
} else {
    Log-HealthCheck -CheckName "Remote Origin Configured" -Level "FAIL" -Message "Remote 'origin' missing"
}

# 3. Check Fetch URL Points to Primary Repo
$FetchUrl = (git remote get-url origin 2>$null).Trim()
if ($FetchUrl -eq $PrimaryRepo) {
    Log-HealthCheck -CheckName "Origin Fetch URL" -Level "PASS" -Message "Points to Primary Repo ($PrimaryRepo)"
} else {
    Log-HealthCheck -CheckName "Origin Fetch URL" -Level "FAIL" -Message "Expected $PrimaryRepo, found $FetchUrl"
}

# 4. Check Dual Push URLs Exist
$PushUrls = (git remote get-url --push --all origin 2>$null)
$HasPrimaryPush = $PushUrls -contains $PrimaryRepo
$HasMirrorPush  = $PushUrls -contains $MirrorRepo

if ($HasPrimaryPush -and $HasMirrorPush) {
    Log-HealthCheck -CheckName "Dual Push URLs" -Level "PASS" -Message "Both Primary and Mirror push URLs configured"
} elseif ($HasPrimaryPush -or $HasMirrorPush) {
    Log-HealthCheck -CheckName "Dual Push URLs" -Level "WARNING" -Message "Incomplete push URLs. Primary: $HasPrimaryPush, Mirror: $HasMirrorPush"
} else {
    Log-HealthCheck -CheckName "Dual Push URLs" -Level "FAIL" -Message "No push URLs configured for origin"
}

# 5. Check Remote Reachability
$PrimaryHead = (git ls-remote $PrimaryRepo "refs/heads/$Branch" 2>$null)
$MirrorHead  = (git ls-remote $MirrorRepo "refs/heads/$Branch" 2>$null)

if ($PrimaryHead) {
    Log-HealthCheck -CheckName "Primary Remote Reachability" -Level "PASS" -Message "Reachable"
} else {
    Log-HealthCheck -CheckName "Primary Remote Reachability" -Level "FAIL" -Message "Cannot connect to Primary Repo"
}

if ($MirrorHead) {
    Log-HealthCheck -CheckName "Mirror Remote Reachability" -Level "PASS" -Message "Reachable"
} else {
    Log-HealthCheck -CheckName "Mirror Remote Reachability" -Level "FAIL" -Message "Cannot connect to Mirror Repo"
}

# 6. Check Working Tree State
$Uncommitted = (git status --porcelain 2>$null)
if ([string]::IsNullOrWhiteSpace($Uncommitted)) {
    Log-HealthCheck -CheckName "Working Tree Cleanliness" -Level "PASS" -Message "Clean"
} else {
    Log-HealthCheck -CheckName "Working Tree Cleanliness" -Level "WARNING" -Message "Uncommitted changes present in workspace"
}

# 7. Check Current Branch Is main
$CurrentBranch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
if ($CurrentBranch -eq $Branch) {
    Log-HealthCheck -CheckName "Current Branch" -Level "PASS" -Message "On '$Branch'"
} else {
    Log-HealthCheck -CheckName "Current Branch" -Level "WARNING" -Message "On '$CurrentBranch', expected '$Branch'"
}

# 8. Check Local HEAD == origin/main
$LocalHash  = (git rev-parse HEAD 2>$null).Trim()
$OriginHash = (git rev-parse "origin/$Branch" 2>$null).Trim()

if ($LocalHash -eq $OriginHash) {
    Log-HealthCheck -CheckName "HEAD Alignment (HEAD == origin/$Branch)" -Level "PASS" -Message "Synchronized ($LocalHash)"
} else {
    Log-HealthCheck -CheckName "HEAD Alignment (HEAD == origin/$Branch)" -Level "WARNING" -Message "Local HEAD ($LocalHash) != origin/$Branch ($OriginHash)"
}

Write-Host ""
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
if ($Status -eq "PASS") {
    Write-Host "  OVERALL HEALTH STATUS: [ PASS ]" -ForegroundColor Green
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    exit 0
} elseif ($Status -eq "WARNING") {
    Write-Host "  OVERALL HEALTH STATUS: [ WARNING ]" -ForegroundColor Yellow
    Write-Host "  Warnings: $($Warnings -join '; ')" -ForegroundColor Yellow
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "  OVERALL HEALTH STATUS: [ FAIL ]" -ForegroundColor Red
    Write-Host "  Failures: $($Failures -join '; ')" -ForegroundColor Red
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    exit 1
}
