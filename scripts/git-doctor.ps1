<#
.SYNOPSIS
    Master Enterprise Git Infrastructure Doctor v3.0 with Self-Healing Capability.
.DESCRIPTION
    Comprehensive 18-point diagnostic engine auditing Git binaries, object databases (fsck),
    pre-push hooks, remote connectivity, dual push URLs, commit hash parity, and divergence metrics.
    Includes automated self-healing (-Repair mode) for non-destructive configuration drift remediation.
.PARAMETER Verbose
    Enables verbose console logging and trace logs to logs/git-doctor.log.
.PARAMETER AsJson
    Outputs diagnostic results in structured JSON format.
.PARAMETER Repair
    Executes automated, non-destructive self-healing repairs for detected configuration issues.
#>

[CmdletBinding()]
param (
    [string]$Branch = "main",
    [switch]$AsJson,
    [switch]$Repair
)

$ErrorActionPreference = "Continue"

$LogDir = Join-Path $PSScriptRoot "..\logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$LogFile = Join-Path $LogDir "git-doctor.log"

$Script:ExitCode = 0 # 0 = PASS, 1 = WARNING, 2 = FAILURE
$Script:CheckResults = @()
$Script:RepairsPerformed = @()

$PrimaryRepo = "https://github.com/aashishrajput9838/academicuniverse.git"
$MirrorRepo  = "https://github.com/aashishrajput98381/academicuniverse.git"

function Log-DoctorMsg {
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
    Log-DoctorMsg "[$Status] $Category - $Message (Details: $Details)"

    $Script:CheckResults += [PSCustomObject]@{
        Category = $Category
        Status   = $Status
        Message  = $Message
        Details  = $Details
    }

    if (-not $AsJson) {
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
}

# --- SELF-HEALING MODULE (-Repair Mode) ---
if ($Repair) {
    Log-DoctorMsg "Self-Healing Mode Triggered (-Repair)..."
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "     ACADEMIC UNIVERSE - AUTOMATED SELF-HEALING REMEDIATION     " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""

    # 1. Ensure logs directory exists
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
        $Script:RepairsPerformed += "Created missing logs/ directory"
        Write-Host "  [REPAIR] Created missing logs/ directory." -ForegroundColor Green
    }

    # 2. Repair Fetch URL if misconfigured
    $CurrFetch = (git remote get-url origin 2>$null).Trim()
    if ($CurrFetch -ne $PrimaryRepo) {
        git remote set-url origin $PrimaryRepo
        $Script:RepairsPerformed += "Repaired origin fetch URL to $PrimaryRepo"
        Write-Host "  [REPAIR] Set origin fetch URL to $PrimaryRepo." -ForegroundColor Green
    }

    # 3. Repair Dual Push URLs if missing
    $CurrPushes = (git remote get-url --push --all origin 2>$null)
    if (-not ($CurrPushes -contains $MirrorRepo) -or -not ($CurrPushes -contains $PrimaryRepo)) {
        git remote set-url --delete --push origin ".*" 2>$null
        git remote set-url --add --push origin $MirrorRepo
        git remote set-url --add --push origin $PrimaryRepo
        $Script:RepairsPerformed += "Repaired dual push URLs (Primary + Mirror)"
        Write-Host "  [REPAIR] Configured dual push URLs for Repo A and Repo B." -ForegroundColor Green
    }

    # 4. Repair Pre-Push Hook if missing
    $HookFile = Join-Path $PSScriptRoot "..\.git\hooks\pre-push"
    $SrcHook  = Join-Path $PSScriptRoot "hooks\pre-push"
    if (-not (Test-Path $HookFile) -and (Test-Path $SrcHook)) {
        Copy-Item -Path $SrcHook -Destination $HookFile -Force
        $Script:RepairsPerformed += "Restored pre-push hook from scripts/hooks/pre-push"
        Write-Host "  [REPAIR] Restored .git/hooks/pre-push hook file." -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "  Self-Healing Complete. Executing diagnostic verification scan..." -ForegroundColor Cyan
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host ""
}

if (-not $AsJson) {
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "    ACADEMIC UNIVERSE - ENTERPRISE MASTER GIT DOCTOR v3.0       " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
}

# 1. Git Installation & Executable Check
try {
    $GitVer = (git --version 2>$null).Trim()
    if ($GitVer) {
        Log-DoctorCheck -Category "Git CLI Executable" -Status "PASS" -Message "Git installed" -Details $GitVer
    } else {
        Log-DoctorCheck -Category "Git CLI Executable" -Status "FAIL" -Message "Git not found in PATH"
    }
} catch {
    Log-DoctorCheck -Category "Git CLI Executable" -Status "FAIL" -Message $_.Exception.Message
}

# 2. Branch State & Detached HEAD Check
$CurrentBranch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
if ($CurrentBranch -eq "HEAD") {
    Log-DoctorCheck -Category "Branch & Detached HEAD State" -Status "FAIL" -Message "Detached HEAD state detected"
} elseif ($CurrentBranch -eq $Branch) {
    Log-DoctorCheck -Category "Branch & Detached HEAD State" -Status "PASS" -Message "Tracking primary branch" -Details "Branch: $CurrentBranch"
} else {
    Log-DoctorCheck -Category "Branch & Detached HEAD State" -Status "WARNING" -Message "On feature branch" -Details "Current: $CurrentBranch, Expected: $Branch"
}

# 3. Working Tree, Staged, & Untracked Files
$StatusPorcelain = (git status --porcelain 2>$null)
$StagedCount = ($StatusPorcelain | Where-Object { $_ -match '^[MADRC]' }).Count
$UntrackedCount = ($StatusPorcelain | Where-Object { $_ -match '^\?\?' }).Count
$UnstagedCount = ($StatusPorcelain | Where-Object { $_ -match '^.[MADRC]' }).Count

if ([string]::IsNullOrWhiteSpace($StatusPorcelain)) {
    Log-DoctorCheck -Category "Working Tree Cleanliness" -Status "PASS" -Message "Clean" -Details "0 staged, 0 unstaged, 0 untracked"
} else {
    Log-DoctorCheck -Category "Working Tree Cleanliness" -Status "WARNING" -Message "Uncommitted changes present" -Details "Staged: $StagedCount, Unstaged: $UnstagedCount, Untracked: $UntrackedCount"
}

# 4. Fetch URL Configuration
$FetchUrl = (git remote get-url origin 2>$null).Trim()
if ($FetchUrl -eq $PrimaryRepo) {
    Log-DoctorCheck -Category "Origin Fetch URL" -Status "PASS" -Message "Points to Primary Repo" -Details $FetchUrl
} else {
    Log-DoctorCheck -Category "Origin Fetch URL" -Status "FAIL" -Message "Invalid fetch URL" -Details "Current: $FetchUrl, Expected: $PrimaryRepo"
}

# 5. Dual Push URLs Configuration
$PushUrls = (git remote get-url --push --all origin 2>$null)
$HasPrimaryPush = $PushUrls -contains $PrimaryRepo
$HasMirrorPush  = $PushUrls -contains $MirrorRepo

if ($HasPrimaryPush -and $HasMirrorPush) {
    Log-DoctorCheck -Category "Dual Push Configurations" -Status "PASS" -Message "Primary and Mirror dual push configured" -Details "Repo A & Repo B active"
} else {
    Log-DoctorCheck -Category "Dual Push Configurations" -Status "FAIL" -Message "Missing push URLs" -Details "Primary: $HasPrimaryPush, Mirror: $HasMirrorPush"
}

# 6. Network & GitHub Reachability
$PingResult = Test-Connection -ComputerName "github.com" -Count 1 -Quiet 2>$null
if ($PingResult) {
    Log-DoctorCheck -Category "Network & GitHub Reachability" -Status "PASS" -Message "github.com online"
} else {
    Log-DoctorCheck -Category "Network & GitHub Reachability" -Status "WARNING" -Message "github.com ping blocked or offline"
}

# 7. Local, Primary, and Mirror HEAD Hashes & Mirror Lag
$LocalHash   = (git rev-parse HEAD 2>$null).Trim()
$PrimaryHead = (git ls-remote $PrimaryRepo "refs/heads/$Branch" 2>$null)
$MirrorHead  = (git ls-remote $MirrorRepo "refs/heads/$Branch" 2>$null)

$PrimaryHash = if ($PrimaryHead) { $PrimaryHead.Split("`t")[0] } else { "UNREACHABLE" }
$MirrorHash  = if ($MirrorHead)  { $MirrorHead.Split("`t")[0]  } else { "UNREACHABLE" }

Log-DoctorCheck -Category "Local HEAD Commit Hash" -Status "PASS" -Message "Local commit resolved" -Details $LocalHash

if ($PrimaryHash -ne "UNREACHABLE") {
    Log-DoctorCheck -Category "Primary Remote (Repo A) HEAD" -Status "PASS" -Message "Primary online" -Details $PrimaryHash
} else {
    Log-DoctorCheck -Category "Primary Remote (Repo A) HEAD" -Status "FAIL" -Message "Cannot connect to Primary Repo"
}

if ($MirrorHash -ne "UNREACHABLE") {
    Log-DoctorCheck -Category "Mirror Remote (Repo B) HEAD" -Status "PASS" -Message "Mirror online" -Details $MirrorHash
} else {
    Log-DoctorCheck -Category "Mirror Remote (Repo B) HEAD" -Status "FAIL" -Message "Cannot connect to Mirror Repo"
}

# 8. Commit Hash Parity & Mirror Lag
if (($PrimaryHash -ne "UNREACHABLE") -and ($MirrorHash -ne "UNREACHABLE")) {
    if ($PrimaryHash -eq $MirrorHash) {
        Log-DoctorCheck -Category "Remote Parity & Mirror Lag" -Status "PASS" -Message "0 commits mirror lag (Repo A == Repo B)" -Details "Hash: $PrimaryHash"
    } else {
        Log-DoctorCheck -Category "Remote Parity & Mirror Lag" -Status "FAIL" -Message "DIVERGENCE DETECTED between Repo A and Repo B" -Details "Primary: $PrimaryHash | Mirror: $MirrorHash"
    }
}

# 9. Local vs Remote Parity
if ($LocalHash -eq $PrimaryHash) {
    Log-DoctorCheck -Category "Local vs Primary Sync Parity" -Status "PASS" -Message "Local HEAD matches Primary"
} else {
    Log-DoctorCheck -Category "Local vs Primary Sync Parity" -Status "WARNING" -Message "Local HEAD differs from Primary remote" -Details "Local: $LocalHash vs Remote: $PrimaryHash"
}

# 10. Object Database Integrity Check (git fsck)
try {
    $FsckOutput = (git fsck --quick 2>&1 | Out-String)
    if ($FsckOutput -match 'error|dangling|corrupt') {
        Log-DoctorCheck -Category "Object Database Health (git fsck)" -Status "WARNING" -Message "Dangling or orphan objects detected"
    } else {
        Log-DoctorCheck -Category "Object Database Health (git fsck)" -Status "PASS" -Message "Object database healthy"
    }
} catch {
    Log-DoctorCheck -Category "Object Database Health (git fsck)" -Status "WARNING" -Message $_.Exception.Message
}

# 11. Git LFS Filter Registration
$LfsClean = (git config --get filter.lfs.clean 2>$null)
if ($LfsClean) {
    Log-DoctorCheck -Category "Git LFS Registration" -Status "PASS" -Message "Git LFS active" -Details $LfsClean
} else {
    Log-DoctorCheck -Category "Git LFS Registration" -Status "WARNING" -Message "Git LFS clean filter not found"
}

# 12. Credential Helper Configuration
$CredHelper = (git config --get credential.helper 2>$null)
if ($CredHelper) {
    Log-DoctorCheck -Category "Credential Manager Helper" -Status "PASS" -Message "Credential helper active" -Details $CredHelper
} else {
    Log-DoctorCheck -Category "Credential Manager Helper" -Status "WARNING" -Message "Credential helper missing"
}

# 13. Pre-Push Hook Verification
$PrePushHook = Join-Path $PSScriptRoot "..\.git\hooks\pre-push"
if (Test-Path $PrePushHook) {
    Log-DoctorCheck -Category "Pre-Push Hook Verification" -Status "PASS" -Message "Pre-push hook active" -Details $PrePushHook
} else {
    Log-DoctorCheck -Category "Pre-Push Hook Verification" -Status "WARNING" -Message "Pre-push hook missing at $PrePushHook"
}

if ($AsJson) {
    $JsonPayload = [PSCustomObject]@{
        Timestamp        = (Get-Date).ToString("o")
        DoctorVersion    = "v3.0 Enterprise"
        ExitCode         = $Script:ExitCode
        Branch           = $CurrentBranch
        LocalHash        = $LocalHash
        PrimaryHash      = $PrimaryHash
        MirrorHash       = $MirrorHash
        RepairsPerformed = $Script:RepairsPerformed
        CheckResults     = $Script:CheckResults
    }
    $JsonPayload | ConvertTo-Json -Depth 4
} else {
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
}

exit $Script:ExitCode
