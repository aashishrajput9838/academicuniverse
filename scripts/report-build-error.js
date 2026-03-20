const https = require('https');
const http = require('http');

/**
 * Custom NPM Script Bypass for Vercel Webhooks (Hobby Tier)
 * This script runs ONLY if `next build` fails, securely shooting the crash 
 * telemetry to the log-analyzer without blocking or crashing further.
 */

// We utilize native Node HTTP modules to guarantee it works without requiring package installs
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL 
  ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/logs/vercel-build`
  : 'https://academicuniverse-backend.onrender.com/api/logs/vercel-build';

async function reportError() {
  try {
    const payload = JSON.stringify({
      type: 'deployment.error',
      payload: {
        deployment: {
          url: process.env.VERCEL_URL || 'Local / Hobby Branch',
          inspectorUrl: 'Check Vercel Build Logs instantly to debug',
          meta: {
            error: 'Turbopack / Next.js Build Compilation Failed. The webhook caught it.'
          }
        },
        project: {
          name: 'Academic Universe (Free Webhook Bypass)'
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

    console.log('[AI Logger] Build failed. Forwarding stack trace telemetry to backend...');

    await new Promise((resolve) => {
        const req = client.request(parsedUrl.toString(), options, (res) => {
          res.on('data', () => {}); // consume response
          res.on('end', () => resolve(true));
        });

        // Fail silently and immediately if the network drops to avoid hanging the build environment
        req.on('error', () => resolve(false));
        
        req.setTimeout(3000, () => {
            req.destroy();
            resolve(false);
        });

        req.write(payload);
        req.end();
    });

  } catch (err) {
    // Fail absolutely silently so we don't pollute the Vercel logs with our own telemetry trace
  } finally {
    // CRITICAL: Exit with code 1 so Vercel realizes the build actually crashed
    // If we exit with 0, Vercel will think the build succeeded and deploy a broken site!
    process.exit(1);
  }
}

reportError();
