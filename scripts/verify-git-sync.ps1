<#
.SYNOPSIS
    Verify Dual Git Repository Synchronization Status for Academic Universe.
.DESCRIPTION
    Audits local branch state, working tree cleanliness, fetch/push URLs, and tests
    connectivity and commit hash alignment across Primary and Mirror repositories.
#>

[CmdletBinding()]
param (
    [string]$Branch = "main"
)

$ErrorActionPreference = "Continue"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  ACADEMIC UNIVERSE - DUAL GIT REPOSITORY SYNC VERIFICATION   " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$PrimaryRepo = "https://github.com/aashishrajput9838/academicuniverse.git"
$MirrorRepo  = "https://github.com/aashishrajput98381/academicuniverse.git"

$OverallStatus = "PASS"
$FailedChecks = @()

function Report-Check {
    param (
        [string]$Name,
        [bool]$Success,
        [string]$Details
    )

    if ($Success) {
        Write-Host "[ PASS ] " -ForegroundColor Green -NoNewline
        Write-Host "$Name " -ForegroundColor White -NoNewline
        if ($Details) { Write-Host "($Details)" -ForegroundColor Gray } else { Write-Host "" }
    } else {
        Write-Host "[ FAIL ] " -ForegroundColor Red -NoNewline
        Write-Host "$Name " -ForegroundColor White -NoNewline
        if ($Details) { Write-Host "($Details)" -ForegroundColor Red } else { Write-Host "" }
        $script:OverallStatus = "FAIL"
        $script:FailedChecks += $Name
    }
}

# 1. Current Branch Check
$CurrentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
Report-Check -Name "Current Branch Check" -Success ($CurrentBranch -eq $Branch) -Details "Branch: $CurrentBranch (Expected: $Branch)"

# 2. Working Tree Cleanliness
$StatusOutput = (git status --porcelain)
$IsClean = [string]::IsNullOrWhiteSpace($StatusOutput)
Report-Check -Name "Working Tree Cleanliness" -Success $IsClean -Details $(if ($IsClean) { "Clean" } else { "Uncommitted changes detected" })

# 3. Fetch URL Check
$FetchUrl = (git remote get-url origin).Trim()
$FetchValid = ($FetchUrl -eq $PrimaryRepo)
Report-Check -Name "Fetch URL Configuration" -Success $FetchValid -Details "Fetch: $FetchUrl"

# 4. Push URLs Check
$PushUrls = (git remote get-url --push --all origin)
$HasMirror  = $PushUrls -contains $MirrorRepo
$HasPrimary = $PushUrls -contains $PrimaryRepo
$PushValid  = ($HasMirror -and $HasPrimary)
Report-Check -Name "Dual Push URLs Configuration" -Success $PushValid -Details "Mirror: $HasMirror, Primary: $HasPrimary"

# 5. Remote Connectivity Check - Primary Repo
$PrimaryHead = (git ls-remote $PrimaryRepo "refs/heads/$Branch" 2>$null)
$PrimaryReachable = [string]::IsNullOrWhiteSpace($PrimaryHead) -eq $false
$PrimaryHash = if ($PrimaryReachable) { $PrimaryHead.Split("`t")[0] } else { $null }
Report-Check -Name "Primary Remote Reachable (Repo A)" -Success $PrimaryReachable -Details "Hash: $PrimaryHash"

# 6. Remote Connectivity Check - Mirror Repo
$MirrorHead = (git ls-remote $MirrorRepo "refs/heads/$Branch" 2>$null)
$MirrorReachable = [string]::IsNullOrWhiteSpace($MirrorHead) -eq $false
$MirrorHash = if ($MirrorReachable) { $MirrorHead.Split("`t")[0] } else { $null }
Report-Check -Name "Mirror Remote Reachable (Repo B)" -Success $MirrorReachable -Details "Hash: $MirrorHash"

# 7. Hash Parity Verification
$HashMatch = ($PrimaryHash -ne $null) -and ($PrimaryHash -eq $MirrorHash)
Report-Check -Name "Commit Hash Synchronization Parity" -Success $HashMatch -Details "Repo A == Repo B: $HashMatch"

# 8. Local HEAD vs Remote Synchronization Status
$LocalHash = (git rev-parse HEAD).Trim()
$LocalSynced = ($LocalHash -eq $PrimaryHash)
Report-Check -Name "Local HEAD Alignment with Remotes" -Success $LocalSynced -Details "Local: $LocalHash"

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
