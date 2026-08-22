import subprocess
import sys
import re

print("=========================================================")
print(" INITIATING LIVE GIT PUSH WITH REAL-TIME PERCENTAGE TRACKING")
print("=========================================================")

cmd = ["git", "push", "--progress", "origin", "main"]

process = subprocess.Popen(
    cmd,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1,
    universal_newlines=True
)

# Git sends progress to stderr with \r carriage returns
def monitor_stream():
    # Read stderr character by character to handle \r updates
    buffer = ""
    while True:
        char = process.stderr.read(1)
        if not char and process.poll() is not None:
            break
        if char:
            if char in ['\r', '\n']:
                line = buffer.strip()
                buffer = ""
                if line:
                    # Parse percentage
                    match = re.search(r'(\d+)%', line)
                    if match:
                        pct = match.group(1)
                        print(f"[PUSH PROGRESS] {line}  --> {pct}% Completed")
                    else:
                        print(f"[PUSH STATUS] {line}")
                    sys.stdout.flush()
            else:
                buffer += char

    if buffer.strip():
        print(f"[PUSH FINAL] {buffer.strip()}")

monitor_stream()
ret = process.wait()
if ret == 0:
    print("=========================================================")
    print(" [SUCCESS 100%] GIT PUSH COMPLETED SUCCESSFULLY TO MAIN!")
    print("=========================================================")
else:
    print(f"[ERROR] Git push exited with code {ret}")
    sys.exit(ret)
