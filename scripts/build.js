const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL 
  ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/logs/vercel-build`
  : 'https://academicuniverse-backend.onrender.com/api/logs/vercel-build';

async function reportError(errorLog) {
  try {
    const payload = JSON.stringify({
      type: 'deployment.error',
      payload: {
        deployment: {
          url: process.env.VERCEL_URL || 'Local / Hobby Branch',
          inspectorUrl: 'Check Vercel Build Logs instantly to debug',
          meta: {
            error: errorLog
          }
        },
        project: {
          name: 'Academic Universe (Custom Build Wrapper)'
        }
      }
    });

    const parsedUrl = new URL(apiUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    console.log('\n[AI Logger] Build failed. Forwarding real stack trace telemetry to backend...');

    await new Promise((resolve) => {
        const req = client.request(parsedUrl.toString(), options, (res) => {
          res.on('data', () => {}); // consume response
          res.on('end', () => resolve(true));
        });

        // Fail silently and immediately if the network drops to avoid hanging the build environment
        req.on('error', () => resolve(false));
        
        req.setTimeout(5000, () => {
            req.destroy();
            resolve(false);
        });

        req.write(payload);
        req.end();
    });

  } catch (err) {
    // Fail absolutely silently so we don't pollute the Vercel logs with our own telemetry trace
  }
}

// Spawn the actual nextjs build process
const child = spawn('npx', ['next', 'build'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

let outputLog = '';

child.stdout.on('data', (data) => {
  process.stdout.write(data);
  outputLog += data.toString();
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
  outputLog += data.toString();
});

child.on('close', async (code) => {
  if (code !== 0) {
    // Keep only the last 4000 chars to avoid payload too large (Vercel has limits on webhook sizes)
    const clampedLog = outputLog.length > 4000 ? outputLog.slice(-4000) : outputLog;
    await reportError(clampedLog);
    // CRITICAL: Exit with code 1 so Vercel realizes the build actually crashed
    process.exit(code);
  }
  process.exit(0);
});
