<#
.SYNOPSIS
    Master Git Infrastructure Doctor & Diagnostic Tool for Academic Universe.
.DESCRIPTION
    Comprehensive, production-ready diagnostic tool checking Git binaries, LFS, hooks,
    remote connectivity, dual push URL configurations, commit hash parity, and divergence metrics.
.PARAMETER Verbose
    Enables verbose console output and detailed telemetry logging to logs/git-doctor.log.
#>

[CmdletBinding()]
param (
    [string]$Branch = "main"
)

$ErrorActionPreference = "Continue"

$LogDir = Join-Path $PSScriptRoot "..\logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$LogFile = Join-Path $LogDir "git-doctor.log"

$Script:ExitCode = 0 # 0 = PASS, 1 = WARNING, 2 = FATAL
$Script:CheckResults = @()

$PrimaryRepo = "https://github.com/aashishrajput9838/academicuniverse.git"
$MirrorRepo  = "https://github.com/aashishrajput98381/academicuniverse.git"

function Log-Message {
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

function Log-DoctorCheck {
    param (
        [string]$Category,
        [string]$Status, # PASS, WARNING, FAIL
        [string]$Message,
        [string]$Details = ""
    )

    $TimeStamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Log-Message "[$Status] $Category - $Message (Details: $Details)"

    $Script:CheckResults += [PSCustomObject]@{
        Category = $Category
        Status   = $Status
        Message  = $Message
        Details  = $Details
    }

    switch ($Status) {
        "PASS" {
            Write-Host "[ PASS ]    " -ForegroundColor Green -NoNewline
            Write-Host "$Category " -ForegroundColor White -NoNewline
            if ($Details) { Write-Host "($Details)" -ForegroundColor Gray } else { Write-Host "" }
        }
        "WARNING" {
            Write-Host "[ WARNING ] " -ForegroundColor Yellow -NoNewline
            Write-Host "$Category " -ForegroundColor White -NoNewline
            if ($Details) { Write-Host "($Details)" -ForegroundColor Yellow } else { Write-Host "" }
            if ($Script:ExitCode -lt 1) { $Script:ExitCode = 1 }
        }
        "FAIL" {
            Write-Host "[ FAIL ]    " -ForegroundColor Red -NoNewline
            Write-Host "$Category " -ForegroundColor White -NoNewline
            if ($Details) { Write-Host "($Details)" -ForegroundColor Red } else { Write-Host "" }
            $Script:ExitCode = 2
        }
    }
}

Log-Message "Starting Git Doctor Diagnosis..."
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "        ACADEMIC UNIVERSE - MASTER GIT DOCTOR v2.0              " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Git Installation & Version
try {
    $GitVer = (git --version 2>$null).Trim()
    if ($GitVer) {
        Log-DoctorCheck -Category "Git CLI Installation" -Status "PASS" -Message "Git installed" -Details $GitVer
    } else {
        Log-DoctorCheck -Category "Git CLI Installation" -Status "FAIL" -Message "Git not found in PATH"
    }
} catch {
    Log-DoctorCheck -Category "Git CLI Installation" -Status "FAIL" -Message $_.Exception.Message
}

# 2. Current Branch & Detached HEAD Check
$CurrentBranch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
if ($CurrentBranch -eq "HEAD") {
    Log-DoctorCheck -Category "Branch State" -Status "FAIL" -Message "Detached HEAD state detected"
} elseif ($CurrentBranch -eq $Branch) {
    Log-DoctorCheck -Category "Branch State" -Status "PASS" -Message "Tracking default branch" -Details "Branch: $CurrentBranch"
} else {
    Log-DoctorCheck -Category "Branch State" -Status "WARNING" -Message "Not on primary branch" -Details "Current: $CurrentBranch, Expected: $Branch"
}

# 3. Working Tree, Staged, & Untracked Files
$StatusPorcelain = (git status --porcelain 2>$null)
$StagedCount = ($StatusPorcelain | Where-Object { $_ -match '^[MADRC]' }).Count
$UntrackedCount = ($StatusPorcelain | Where-Object { $_ -match '^\?\?' }).Count
$UnstagedCount = ($StatusPorcelain | Where-Object { $_ -match '^.[MADRC]' }).Count

if ([string]::IsNullOrWhiteSpace($StatusPorcelain)) {
    Log-DoctorCheck -Category "Working Tree" -Status "PASS" -Message "Clean" -Details "0 staged, 0 unstaged, 0 untracked"
} else {
    Log-DoctorCheck -Category "Working Tree" -Status "WARNING" -Message "Uncommitted changes present" -Details "Staged: $StagedCount, Unstaged: $UnstagedCount, Untracked: $UntrackedCount"
}

# 4. Fetch URL Configuration
$FetchUrl = (git remote get-url origin 2>$null).Trim()
if ($FetchUrl -eq $PrimaryRepo) {
    Log-DoctorCheck -Category "Fetch URL" -Status "PASS" -Message "Points to Primary Repo" -Details $FetchUrl
} else {
    Log-DoctorCheck -Category "Fetch URL" -Status "FAIL" -Message "Invalid fetch URL" -Details "Current: $FetchUrl, Expected: $PrimaryRepo"
}

# 5. Dual Push URLs Configuration
$PushUrls = (git remote get-url --push --all origin 2>$null)
$HasPrimaryPush = $PushUrls -contains $PrimaryRepo
$HasMirrorPush  = $PushUrls -contains $MirrorRepo

if ($HasPrimaryPush -and $HasMirrorPush) {
    Log-DoctorCheck -Category "Dual Push Configuration" -Status "PASS" -Message "Primary and Mirror dual push configured" -Details "Repo A & Repo B present"
} else {
    Log-DoctorCheck -Category "Dual Push Configuration" -Status "FAIL" -Message "Missing push URLs" -Details "Primary: $HasPrimaryPush, Mirror: $HasMirrorPush"
}

# 6. Network & GitHub Reachability
$PingResult = Test-Connection -ComputerName "github.com" -Count 1 -Quiet 2>$null
if ($PingResult) {
    Log-DoctorCheck -Category "Network & GitHub Access" -Status "PASS" -Message "github.com reachable"
} else {
    Log-DoctorCheck -Category "Network & GitHub Access" -Status "WARNING" -Message "Ping to github.com blocked or offline"
}

# 7. Local, Primary, and Mirror HEAD Hashes
$LocalHash   = (git rev-parse HEAD 2>$null).Trim()
$PrimaryHead = (git ls-remote $PrimaryRepo "refs/heads/$Branch" 2>$null)
$MirrorHead  = (git ls-remote $MirrorRepo "refs/heads/$Branch" 2>$null)

$PrimaryHash = if ($PrimaryHead) { $PrimaryHead.Split("`t")[0] } else { "UNREACHABLE" }
$MirrorHash  = if ($MirrorHead)  { $MirrorHead.Split("`t")[0]  } else { "UNREACHABLE" }

Log-DoctorCheck -Category "Local HEAD Hash" -Status "PASS" -Message "Resolved local commit" -Details $LocalHash

if ($PrimaryHash -ne "UNREACHABLE") {
    Log-DoctorCheck -Category "Primary Remote HEAD" -Status "PASS" -Message "Primary Repo (Repo A) reachable" -Details $PrimaryHash
} else {
    Log-DoctorCheck -Category "Primary Remote HEAD" -Status "FAIL" -Message "Cannot connect to Primary Repo"
}

if ($MirrorHash -ne "UNREACHABLE") {
    Log-DoctorCheck -Category "Mirror Remote HEAD" -Status "PASS" -Message "Mirror Repo (Repo B) reachable" -Details $MirrorHash
} else {
    Log-DoctorCheck -Category "Mirror Remote HEAD" -Status "FAIL" -Message "Cannot connect to Mirror Repo"
}

# 8. Hash Parity & Divergence Detection
if (($PrimaryHash -ne "UNREACHABLE") -and ($MirrorHash -ne "UNREACHABLE")) {
    if ($PrimaryHash -eq $MirrorHash) {
        Log-DoctorCheck -Category "Remote Parity" -Status "PASS" -Message "Repo A and Repo B identically aligned" -Details "Hash: $PrimaryHash"
    } else {
        Log-DoctorCheck -Category "Remote Parity" -Status "FAIL" -Message "DIVERGENCE DETECTED between Repo A and Repo B" -Details "Primary: $PrimaryHash | Mirror: $MirrorHash"
    }
}

# 9. Local vs Remote Parity
if ($LocalHash -eq $PrimaryHash) {
    Log-DoctorCheck -Category "Local-Remote Parity" -Status "PASS" -Message "Local HEAD matches Primary remote"
} else {
    Log-DoctorCheck -Category "Local-Remote Parity" -Status "WARNING" -Message "Local HEAD differs from Primary remote" -Details "Local: $LocalHash vs Remote: $PrimaryHash"
}

# 10. Git LFS Filter Registration
$LfsClean = (git config --get filter.lfs.clean 2>$null)
if ($LfsClean) {
    Log-DoctorCheck -Category "Git LFS Filters" -Status "PASS" -Message "Git LFS registered" -Details $LfsClean
} else {
    Log-DoctorCheck -Category "Git LFS Filters" -Status "WARNING" -Message "Git LFS filter clean not set"
}

# 11. Credential Helper Configuration
$CredHelper = (git config --get credential.helper 2>$null)
if ($CredHelper) {
    Log-DoctorCheck -Category "Credential Helper" -Status "PASS" -Message "Credential manager active" -Details $CredHelper
} else {
    Log-DoctorCheck -Category "Credential Helper" -Status "WARNING" -Message "Credential helper not configured"
}

# 12. Git Hooks Verification (.git/hooks/pre-push)
$PrePushHookPath = Join-Path $PSScriptRoot "..\.git\hooks\pre-push"
if (Test-Path $PrePushHookPath) {
    Log-DoctorCheck -Category "Pre-Push Hook" -Status "PASS" -Message "Pre-push hook exists" -Details $PrePushHookPath
} else {
    Log-DoctorCheck -Category "Pre-Push Hook" -Status "WARNING" -Message "Pre-push hook missing at $PrePushHookPath"
}

Write-Host ""
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
if ($Script:ExitCode -eq 0) {
    Write-Host "  DOCTOR DIAGNOSIS: [ PASS ] - System Git Infrastructure Healthy!" -ForegroundColor Green
} elseif ($Script:ExitCode -eq 1) {
    Write-Host "  DOCTOR DIAGNOSIS: [ WARNING ] - Warnings detected. Check log." -ForegroundColor Yellow
} else {
    Write-Host "  DOCTOR DIAGNOSIS: [ FAIL ] - Critical failures detected!" -ForegroundColor Red
}
Write-Host "  Detailed Diagnostic Log: $LogFile" -ForegroundColor Gray
Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan

exit $Script:ExitCode
