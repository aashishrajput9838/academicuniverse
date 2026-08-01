import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://academicuniverse.onrender.com';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code || !state) {
    const errorMsg = error || 'Missing authorization code or state parameter';
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>GitHub Connection Error</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #fff; text-align: center; padding: 40px;">
          <h2 style="color: #ef4444;">GitHub Connection Error</h2>
          <p>${errorMsg}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_CONNECT_ERROR', error: '${errorMsg}' }, '*');
              setTimeout(() => window.close(), 1200);
            }
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    // Forward code exchange to backend
    const backendRes = await fetch(
      `${API_BASE_URL}/api/github/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      { method: 'GET', headers: { 'Accept': 'application/json' } }
    );

    const isSuccess = backendRes.ok;

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>GitHub Connected</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #fff; text-align: center; padding: 40px;">
          <h2 style="color: #10b981;">GitHub Account Connected!</h2>
          <p>Your repositories and skills are syncing. You can close this window.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_CONNECTED', success: ${isSuccess} }, '*');
              setTimeout(() => window.close(), 300);
            } else {
              setTimeout(() => {
                window.location.href = '/dashboard/student/skills';
              }, 1500);
            }
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err: any) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>GitHub Connection</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #fff; text-align: center; padding: 40px;">
          <h2 style="color: #10b981;">GitHub Authentication Received</h2>
          <p>Processing connection...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_CONNECTED', code: '${code}', state: '${state}' }, '*');
              setTimeout(() => window.close(), 300);
            }
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
