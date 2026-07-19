# Investigation Ticket: Duplicate Backend Startup

## Problem Statement

During development, the backend sometimes appears to start successfully (logs show "Server running on port 5003") but `http://localhost:5003/health` returns `ERR_CONNECTION_REFUSED` and `netstat` shows no listener on port 5003.

## Hypothesis

Two independent backend instances are being launched simultaneously. One wins the port race and logs success; the other fails silently. When the winner subsequently crashes, the port is left unbound.

## Acceptance Criteria

- [ ] Reproduce the duplicate launch condition
- [ ] Identify the exact launcher (Kilo extension, VS Code task, npm, user action)
- [ ] Determine whether Kilo, npm, VS Code, or user action caused the duplicate
- [ ] Provide reproducible steps
- [ ] Close only after reproduction or elimination

## Investigation Checklist

### 1. Reproduce

- [ ] Monitor process tree during `npm run dev` from Kilo terminal
- [ ] Monitor process tree during manual terminal launch
- [ ] Monitor process tree during VS Code debug launch
- [ ] Capture parent PID chain for every node process running `src/index.ts`

### 2. Identify Launcher

- [ ] Check if Kilo Code extension auto-starts backend tasks
- [ ] Check VS Code `tasks.json` for auto-run configurations
- [ ] Check `.vscode/launch.json` for debug configurations
- [ ] Check npm lifecycle scripts (`postinstall`, `prepare`, etc.)
- [ ] Check for `nodemon`, `ts-node-dev`, or `concurrently` in dev stack
- [ ] Check Windows Event Viewer / Sysmon for process creation events

### 3. Evidence to Collect

For each suspected launcher:

```powershell
# Capture full process tree at startup
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | 
  Select-Object ProcessId, ParentProcessId, CreationDate, CommandLine | 
  Format-List
```

```powershell
# Check for duplicate src/index.ts processes
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | 
  Where-Object { $_.CommandLine -like "*src/index.ts*" } | 
  Select-Object ProcessId, ParentProcessId, CreationDate | 
  Format-List
```

### 4. Root Cause Determination

- [ ] If Kilo: identify which Kilo feature triggers auto-start
- [ ] If npm: identify which script or hook triggers duplicate spawn
- [ ] If VS Code: identify which task/debug config triggers duplicate spawn
- [ ] If user action: document the exact sequence

### 5. Remediation

After root cause is identified:

- [ ] Implement targeted fix (not a startup guard)
- [ ] Verify fix prevents duplicate launch
- [ ] Verify single instance binds to port successfully

## Out of Scope

- Startup guards (`EADDRINUSE` handling)
- Process locking mechanisms
- Server-side workarounds for duplicate processes

## Status

**Startup improvements:** MITIGATED  
- `server.on('error')` added after `app.listen()` (commit 7fd0812)
- `server.on('listening')` added for startup verification
- Duplicate SIGINT/SIGTERM handlers removed from inside `app.listen()` callback
- Global signal handlers retained at module level

**Duplicate launch investigation:** OPEN — awaiting reproduction and launcher identification.

## Investigation Log

| Date | Finding | Evidence |
|------|---------|----------|
| 2026-07-19 | Two `src/index.ts` processes observed simultaneously | PID 20388 and 5196, both created at 22:15:50 |
| 2026-07-19 | Parent chain traces to Kilo Code extension | `kilo.exe -> powershell.exe -> npm run dev` |
| 2026-07-19 | Origin of second process not yet confirmed | Need to capture process tree at moment of duplicate spawn |
