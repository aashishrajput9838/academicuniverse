# Dual Git Repository Synchronization & Architecture Guide v2.0

**Project**: Academic Universe  
**Author**: Lead Software Architect & Principal DevOps Engineer  
**Version**: 2.0 Production Standard  

---

## 1. Architecture Overview

Academic Universe uses a **High-Availability Dual-Push Repository Architecture**. Local developer workstations push simultaneously to both a **Primary Repository** and a **Mirror Repository** in a single `git push` invocation.

```mermaid
graph TD
    subgraph Developer Workstation
        LocalRepo["Local Git Repository<br/>(main branch @ HEAD)"]
        PrePushHook["Pre-Push Validation Hook<br/>(.git/hooks/pre-push)"]
        DoctorTool["Git Doctor / Sync Script<br/>(scripts/git-doctor.ps1)"]
    end

    subgraph GitHub Remotes
        PrimaryRepo["Primary Repository (Repo A)<br/>aashishrajput9838/academicuniverse"]
        MirrorRepo["Mirror Repository (Repo B)<br/>aashishrajput98381/academicuniverse"]
    end

    subgraph Production Hosting & CI/CD
        VercelFrontend["Vercel Cloud Platform<br/>(Frontend Web App Deployment)"]
        RenderBackend["Render Web Service<br/>(Node.js Express Backend Service)"]
    end

    LocalRepo -->|1. git push origin main| PrePushHook
    PrePushHook -->|2. Validates Branch & Dual Push URLs| PrimaryRepo
    PrePushHook -->|3. Dual Push Atomic Stream| MirrorRepo
    PrimaryRepo -->|GitHub Webhook Trigger| VercelFrontend
    PrimaryRepo -->|Deployment Trigger| RenderBackend
    DoctorTool -.->|Hash Parity Verification| PrimaryRepo
    DoctorTool -.->|Hash Parity Verification| MirrorRepo
```

---

## 2. Primary vs Mirror Repositories

| Attribute | Primary Repository (Repo A) | Mirror Repository (Repo B) |
| :--- | :--- | :--- |
| **GitHub URI** | `https://github.com/aashishrajput9838/academicuniverse.git` | `https://github.com/aashishrajput98381/academicuniverse.git` |
| **Fetch Role** | Primary Source of Truth (`fetch`) | Failover Backup Source |
| **Push Role** | Dual-Push Target 1 | Dual-Push Target 2 |
| **CI/CD Integrations** | Vercel, Render, Sentry | Standby CI/CD Mirror |
| **Access Policy** | Write Access Required | Collaborator / Write Access Required |

---

## 3. Developer Workflow Guidelines

### DO
- **ALWAYS** use `.\scripts\git-sync.ps1` for pushing code to ensure post-push 3-way commit hash verification.
- **ALWAYS** run `.\scripts\git-doctor.ps1` before starting critical release sprints.
- Keep `main` as the default development and production tracking branch.

### DON'T
- **DO NOT** modify push URLs manually without re-running `.\scripts\verify-git-sync.ps1`.
- **DO NOT** force push to a single remote independently (e.g., `git push https://github.com/...`).
- **DO NOT** commit unencrypted API keys or production certificates (`.env`, `serviceAccountKey.json`).

---

## 4. Disaster Recovery & Failover Procedures

### Scenario A: Primary Repository Outage or Deletion
1. Switch local `fetch` URL to point to Mirror Repository:
   ```bash
   git remote set-url origin https://github.com/aashishrajput98381/academicuniverse.git
   ```
2. Verify local repository state against Mirror:
   ```powershell
   .\scripts\verify-git-sync.ps1
   ```
3. Continue development uninterrupted.

### Scenario B: Desynchronization Between Remotes
If commit hashes between Repo A and Repo B differ due to network interruptions:
1. Run automated verification to pinpoint diverged hash:
   ```powershell
   .\scripts\verify-git-sync.ps1
   ```
2. Force-align mirror repository to match primary:
   ```bash
   git push --force origin main
   ```

---

## 5. Adding Another Mirror Repository

To extend dual push to a tertiary mirror (e.g., GitLab, AWS CodeCommit, or 3rd GitHub mirror):

1. Add the push URL to `origin`:
   ```bash
   git remote set-url --add --push origin https://github.com/your-org/academicuniverse-mirror3.git
   ```
2. Verify updated push configuration:
   ```bash
   git remote -v
   ```
3. Update `scripts/verify-git-sync.ps1` and `scripts/git-doctor.ps1` to include the tertiary URI in validation arrays.

---

## 6. Force Push & Rollback Policy

### Force Push Policy
- Force pushing (`git push --force`) is **STRICTLY FORBIDDEN** on production branches except during disaster recovery desynchronization.
- All rollbacks must be performed using revert commits (`git revert <commit-hash>`).

### Production Rollback Procedure
To safely revert a broken commit without breaking dual-repo sync:
```powershell
git revert HEAD --no-edit
.\scripts\git-sync.ps1 -Message "revert: rollback broken commit"
```

---

## 7. Credential & Authentication Troubleshooting

### Issue 1: `Repository not found` or `Authentication failed`
**Root Cause**: GitHub Personal Access Token (PAT) expired, or collaborator invite was pending.
**Resolution**:
1. Check collaborator status on both GitHub repositories.
2. Update Windows Credential Manager:
   ```powershell
   cmdkey /generic:git:https://github.com /user:aashishrajput9838 /pass:<YOUR_GITHUB_TOKEN>
   ```

### Issue 2: `Non-fast-forward (fetch first)`
**Root Cause**: Remote branch has commits not present locally.
**Resolution**:
```bash
git fetch origin main
git rebase origin/main
.\scripts\git-sync.ps1 -Message "fix: resolved fast-forward merge"
```

### Issue 3: `Remote rejected (pre-receive hook declined)`
**Root Cause**: Commit contains files larger than 100MB or forbidden secret signatures.
**Resolution**:
1. Inspect rejected commit payload.
2. Use `git rm --cached <file>` or Git LFS to process large binaries.
