# Sentry Monitoring Setup

Academic Universe now has complete Sentry monitoring for both frontend (Next.js) and backend (Express.js).

## 🎯 What's Configured

### Frontend (Next.js)
- ✅ Error Monitoring - Captures client-side and server-side errors
- ✅ Tracing - Performance tracing across all runtimes
- ✅ Session Replay - Video-like reproduction of user sessions around errors
- ✅ Logging - Structured logs sent to Sentry
- ✅ Source Maps - Proper stack traces with original code
- ✅ Tunnel Route - Circumvents ad-blockers for Sentry requests

### Backend (Express.js)
- ✅ Winston Structured Logging
- ✅ Request ID Tracking
- ✅ Performance Monitoring (API response times)
- ✅ Sentry Error Tracking Integration
- ✅ Automatic log file rotation

## 📁 Configuration Files

### Frontend Files
- `sentry.server.config.ts` - Server-side Sentry config
- `sentry.edge.config.ts` - Edge runtime Sentry config
- `instrumentation.ts` - Registers Sentry for Node.js and Edge
- `instrumentation-client.ts` - Client-side instrumentation
- `next.config.mjs` - Next.js config with Sentry wrapper
- `app/global-error.tsx` - Global error boundary
- `app/sentry-example-page/page.tsx` - Test page
- `app/api/sentry-example-api/route.ts` - Test API route

### Backend Files
- `backend/src/utils/logger.ts` - Winston logger configuration
- `backend/src/middleware/requestId.ts` - Request ID middleware
- `backend/src/middleware/performanceMonitor.ts` - Performance monitoring
- `backend/src/config/sentry.ts` - Sentry initialization
- `backend/LOGGER_EXAMPLES.md` - Logger usage examples

## 🚀 Testing the Setup

### Frontend Test
1. Start your Next.js dev server: `npm run dev`
2. Visit: `http://localhost:3000/sentry-example-page`
3. Click the buttons to trigger test errors
4. Check your Sentry dashboard: https://sharda-university-rq.sentry.io/

### Backend Test
1. Start your backend server: `cd backend && npm run dev`
2. Visit: `http://localhost:5000/health`
3. Check the backend logs in `backend/logs/` directory
4. Check Sentry for any backend errors

## 📊 Sentry Dashboard
- **Organization**: sharda-university-rq
- **Project**: javascript-nextjs (frontend)
- **Backend**: Same DSN - will appear as separate issues
- **Dashboard URL**: https://sharda-university-rq.sentry.io/

## 🔧 Environment Variables

### Frontend
- `.env.sentry-build-plugin` - Sentry auth token (for source maps)

### Backend
- `SENTRY_DSN` - Already added to `backend/.env`

## 💡 Usage Examples

### Frontend - Custom Error Capture
```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // Your code
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'your-feature' },
    extra: { userId: user.id }
  });
}
```

### Backend - Using Winston Logger
```typescript
import logger from '../utils/logger';

logger.info('User logged in', { 
  requestId: req.requestId,
  userId: user._id 
});

logger.error('Database error', { 
  requestId: req.requestId,
  error: err 
});
```

## ⚙️ Configuration Options

### Adjust Sampling Rates
In `sentry.server.config.ts` and `sentry.edge.config.ts`:
```typescript
tracesSampleRate: 0.2, // 20% in production
```

### Disable Session Replay
Set `replaysSessionSampleRate: 0` in client config

### Disable Logs
Set `enableLogs: false`

## 📝 Notes

- **Turbopack Warning**: Sentry is only compatible with Turbopack on Next.js 15.4.1+; you're on 16.1.6 so no problem!
- **Source Maps**: Automatically uploaded during build
- **PII**: `sendDefaultPii: true` is enabled - disable in production if needed
- **CI/CD**: Add `SENTRY_AUTH_TOKEN` to your CI environment variables

## 🆘 Troubleshooting

If Sentry isn't receiving events:
1. Check browser console for errors
2. Verify DSN is correct
3. Check network tab for Sentry requests
4. Make sure ad-blockers aren't blocking (we have tunnel route configured)
