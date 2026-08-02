# Recommended Git Aliases for Academic Universe

**Project**: Academic Universe  
**Target Shell**: PowerShell / Git Bash  

To streamline local workflow diagnostic tasks, developers can register local custom Git aliases. 

> **IMPORTANT**: The repository scripts do **NOT** modify your global Git configuration automatically. Follow the manual opt-in instructions below to register these aliases.

---

## Recommended Aliases

| Alias Command | Target Script | Purpose |
| :--- | :--- | :--- |
| `git doctor` | `scripts/git-doctor.ps1` | Comprehensive 12-point system diagnostic audit |
| `git health` | `scripts/git-health.ps1` | Repository size, latency, and system health check |
| `git sync` | `scripts/git-sync.ps1` | Stage, commit, dual push, and verify remote hash parity |
| `git verify` | `scripts/verify-git-sync.ps1` | Validate local/remote commit hash alignment |
| `git audit` | `scripts/verify-git-sync.ps1 -AsJson` | Output structured JSON sync telemetry |

---

## Installation Instructions

### Option A: Local Repository Config (Recommended)

Run the following commands from your repository root terminal:

```powershell
git config alias.doctor "!powershell -ExecutionPolicy Bypass -File scripts/git-doctor.ps1"
git config alias.health "!powershell -ExecutionPolicy Bypass -File scripts/git-health.ps1"
git config alias.sync   "!powershell -ExecutionPolicy Bypass -File scripts/git-sync.ps1"
git config alias.verify "!powershell -ExecutionPolicy Bypass -File scripts/verify-git-sync.ps1"
git config alias.audit  "!powershell -ExecutionPolicy Bypass -File scripts/verify-git-sync.ps1 -AsJson"
```

### Option B: Global Configuration (User-wide)

If you prefer these aliases to be accessible across all developer workstations:

```powershell
git config --global alias.doctor "!powershell -ExecutionPolicy Bypass -File scripts/git-doctor.ps1"
git config --global alias.health "!powershell -ExecutionPolicy Bypass -File scripts/git-health.ps1"
git config --global alias.sync   "!powershell -ExecutionPolicy Bypass -File scripts/git-sync.ps1"
git config --global alias.verify "!powershell -ExecutionPolicy Bypass -File scripts/verify-git-sync.ps1"
git config --global alias.audit  "!powershell -ExecutionPolicy Bypass -File scripts/verify-git-sync.ps1 -AsJson"
```

---

## Usage Examples

```powershell
# Run system doctor diagnostics
git doctor

# Run automated dual repository sync with custom commit message
git sync -Message "feat(growth): update document intelligence pipeline"

# Verify sync status as JSON payload
git audit
```
