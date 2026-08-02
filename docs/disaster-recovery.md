# Disaster Recovery & Emergency Operations Manual v3.0

**Project**: Academic Universe  
**Target System**: Dual-Repository Git Infrastructure  
**Primary Repository (Repo A)**: `https://github.com/aashishrajput9838/academicuniverse.git`  
**Mirror Repository (Repo B)**: `https://github.com/aashishrajput98381/academicuniverse.git`  

---

## 1. Disaster Recovery Scenarios & Procedures

### Scenario 1: Primary Repository (Repo A) Deletion or Outage
**Symptom**: `git push` fails to update Repo A, or `https://github.com/aashishrajput9838/academicuniverse` returns HTTP 404.

**Recovery Steps**:
1. Temporarily switch local `fetch` URL to point to Mirror Repo B:
   ```bash
   git remote set-url origin https://github.com/aashishrajput98381/academicuniverse.git
   ```
2. Verify local repository health:
   ```powershell
   .\scripts\git-doctor.ps1
   ```
3. Re-create Primary Repo A on GitHub or restore from local backup.
4. Restore dual push URLs:
   ```bash
   git remote set-url --delete --push origin ".*"
   git remote set-url --add --push origin https://github.com/aashishrajput98381/academicuniverse.git
   git remote set-url --add --push origin https://github.com/aashishrajput9838/academicuniverse.git
   ```
5. Force push local `main` branch to rebuild primary remote:
   ```bash
   git push --force origin main
   ```

---

### Scenario 2: Mirror Repository (Repo B) Deletion or Corruption
**Symptom**: `git-sync.ps1` reports `SYNC FAILED` or `Mirror Remote HEAD: UNREACHABLE`.

**Recovery Steps**:
1. Re-create empty GitHub repository `aashishrajput98381/academicuniverse`.
2. Run automated self-healing script:
   ```powershell
   .\scripts\git-doctor.ps1 -Repair
   ```
3. Re-synchronize both remotes:
   ```powershell
   .\scripts\git-sync.ps1 -Message "fix(recovery): restore mirror repository parity"
   ```

---

### Scenario 3: Local Git Hook Corruption (`.git/hooks/pre-push`)
**Symptom**: Pre-push hook error or missing file.

**Recovery Steps**:
1. Run automated hook restoration:
   ```powershell
   .\scripts\git-doctor.ps1 -Repair
   ```

---

### Scenario 4: Credential Loss or Token Expiration
**Symptom**: `Authentication failed` or `403 Forbidden` on push.

**Recovery Steps**:
1. Generate new GitHub Personal Access Token (PAT) with `repo` scope.
2. Update Windows Credential Manager:
   ```powershell
   cmdkey /generic:git:https://github.com /user:aashishrajput9838 /pass:<NEW_GITHUB_TOKEN>
   ```

---

### Scenario 5: Machine Migration (New Developer Workstation Setup)
**Symptom**: Setting up a new workstation from scratch.

**Recovery Steps**:
1. Clone primary repository:
   ```bash
   git clone https://github.com/aashishrajput9838/academicuniverse.git
   cd academicuniverse
   ```
2. Run self-healing setup:
   ```powershell
   .\scripts\git-doctor.ps1 -Repair
   ```
3. Verify 100% PASS:
   ```powershell
   .\scripts\git-health.ps1
   ```
