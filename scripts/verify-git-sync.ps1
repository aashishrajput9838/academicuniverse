<#
.SYNOPSIS
    Verify Dual Git Repository Synchronization Status & Output JSON Telemetry.
.DESCRIPTION
    Audits local branch state, working tree cleanliness, fetch/push URLs, pre-push hooks,
    credential helpers, and tests connectivity and commit hash alignment across Primary and Mirror repos.
.PARAMETER Branch
    Expected tracking branch (default: main).
.PARAMETER AsJson
    If specified, outputs a structured JSON object containing diagnostic results.
.PARAMETER Verbose
    Enables verbose console logging and trace output.
#>

[CmdletBinding()]
param (
    [string]$Branch = "main",
    [switch]$AsJson
)

$ErrorActionPreference = "Continue"

$PrimaryRepo = "https://github.com/aashishrajput9838/academicuniverse.git"
$MirrorRepo  = "https://github.com/aashishrajput98381/academicuniverse.git"

$OverallStatus = "PASS"
$FailedChecks = @()
$CheckResults = @()

function Report-Check {
    param (
        [string]$Name,
        [bool]$Success,
        [string]$Details
    )

    $StatusString = if ($Success) { "PASS" } else { "FAIL" }
    $script:CheckResults += [PSCustomObject]@{
        Name    = $Name
        Status  = $StatusString
        Details = $Details
    }

    if ($Success) {
        if (-not $AsJson) {
            Write-Host "[ PASS ] " -ForegroundColor Green -NoNewline
            Write-Host "$Name " -ForegroundColor White -NoNewline
            if ($Details) { Write-Host "($Details)" -ForegroundColor Gray } else { Write-Host "" }
        }
    } else {
        if (-not $AsJson) {
            Write-Host "[ FAIL ] " -ForegroundColor Red -NoNewline
            Write-Host "$Name " -ForegroundColor White -NoNewline
            if ($Details) { Write-Host "($Details)" -ForegroundColor Red } else { Write-Host "" }
        }
        $script:OverallStatus = "FAIL"
        $script:FailedChecks += $Name
    }
}

if (-not $AsJson) {
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "  ACADEMIC UNIVERSE - DUAL GIT REPOSITORY SYNC VERIFICATION v2.0 " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
}

# 1. Current Branch Check
$CurrentBranch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
Report-Check -Name "Current Branch Check" -Success ($CurrentBranch -eq $Branch) -Details "Branch: $CurrentBranch (Expected: $Branch)"

# 2. Working Tree Cleanliness
$StatusOutput = (git status --porcelain 2>$null)
$IsClean = [string]::IsNullOrWhiteSpace($StatusOutput)
Report-Check -Name "Working Tree Cleanliness" -Success $IsClean -Details $(if ($IsClean) { "Clean" } else { "Uncommitted changes detected" })

# 3. Fetch URL Check
$FetchUrl = (git remote get-url origin 2>$null).Trim()
$FetchValid = ($FetchUrl -eq $PrimaryRepo)
Report-Check -Name "Fetch URL Configuration" -Success $FetchValid -Details "Fetch: $FetchUrl"

# 4. Push URLs Check
$PushUrls = (git remote get-url --push --all origin 2>$null)
$HasMirror  = $PushUrls -contains $MirrorRepo
$HasPrimary = $PushUrls -contains $PrimaryRepo
$PushValid  = ($HasMirror -and $HasPrimary)
Report-Check -Name "Dual Push URLs Configuration" -Success $PushValid -Details "Mirror: $HasMirror, Primary: $HasPrimary"

# 5. Pre-Push Hook Verification
$HookPath = Join-Path $PSScriptRoot "..\.git\hooks\pre-push"
$HookExists = Test-Path $HookPath
Report-Check -Name "Pre-Push Hook Verification" -Success $HookExists -Details "Path: $HookPath"

# 6. Credential Helper Verification
$CredHelper = (git config --get credential.helper 2>$null)
$CredValid = [string]::IsNullOrWhiteSpace($CredHelper) -eq $false
Report-Check -Name "Credential Helper Verification" -Success $CredValid -Details "Helper: $CredHelper"

# 7. Remote Reachability & HEAD - Primary Repo (Repo A)
$PrimaryHead = (git ls-remote $PrimaryRepo "refs/heads/$Branch" 2>$null)
$PrimaryReachable = [string]::IsNullOrWhiteSpace($PrimaryHead) -eq $false
$PrimaryHash = if ($PrimaryReachable) { $PrimaryHead.Split("`t")[0] } else { "UNREACHABLE" }
Report-Check -Name "Primary Remote Reachable (Repo A)" -Success $PrimaryReachable -Details "Hash: $PrimaryHash"

# 8. Remote Reachability & HEAD - Mirror Repo (Repo B)
$MirrorHead = (git ls-remote $MirrorRepo "refs/heads/$Branch" 2>$null)
$MirrorReachable = [string]::IsNullOrWhiteSpace($MirrorHead) -eq $false
$MirrorHash = if ($MirrorReachable) { $MirrorHead.Split("`t")[0] } else { "UNREACHABLE" }
Report-Check -Name "Mirror Remote Reachable (Repo B)" -Success $MirrorReachable -Details "Hash: $MirrorHash"

# 9. Hash Parity Verification (Repo A == Repo B)
$HashMatch = ($PrimaryHash -ne "UNREACHABLE") -and ($PrimaryHash -eq $MirrorHash)
Report-Check -Name "Commit Hash Synchronization Parity" -Success $HashMatch -Details "Repo A == Repo B: $HashMatch"

# 10. Local HEAD Alignment with Remotes
$LocalHash = (git rev-parse HEAD 2>$null).Trim()
$LocalSynced = ($LocalHash -eq $PrimaryHash)
Report-Check -Name "Local HEAD Alignment with Remotes" -Success $LocalSynced -Details "Local: $LocalHash"

if ($AsJson) {
    $TelemetryPayload = [PSCustomObject]@{
        Timestamp     = (Get-Date).ToString("o")
        OverallStatus = $OverallStatus
        Branch        = $CurrentBranch
        LocalHash     = $LocalHash
        PrimaryHash   = $PrimaryHash
        MirrorHash    = $MirrorHash
        FailedCount   = $FailedChecks.Count
        CheckResults  = $CheckResults
    }
    $TelemetryPayload | ConvertTo-Json -Depth 4
} else {
    Write-Host ""
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
    if ($OverallStatus -eq "PASS") {
        Write-Host "  FINAL RESULT: [ SYNC PASS ] - All repositories synchronized!" -ForegroundColor Green
        Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host "  FINAL RESULT: [ SYNC FAIL ] - Failed checks: $($FailedChecks -join ', ')" -ForegroundColor Red
        Write-Host "-----------------------------------------------------------------" -ForegroundColor Cyan
        exit 1
    }
}
