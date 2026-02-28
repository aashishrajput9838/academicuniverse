# Academic Universe - Development Setup Guide

## Common Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

This error occurs when your frontend tries to parse JSON from an API response, but receives HTML instead (usually an error page).

## Root Causes & Solutions

### 1. Backend Server Not Running
**Problem**: Frontend is trying to connect to backend API, but backend server is not started.

**Solution**: 
```bash
# Terminal 1 - Start backend server
cd backend
npm run dev
# or
npm start
```

### 2. Incorrect API URL Configuration
**Problem**: Frontend is making requests to wrong URL or port.

**Solution**: 
- Check that backend is running on port 5000 (default)
- Verify `NEXT_PUBLIC_API_BASE_URL` in `.env.local` file
- Current setup uses `http://localhost:5000`

### 3. CORS Issues
**Problem**: Browser blocks requests due to CORS policy.

**Solution**: 
Already configured in backend:
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
```

## Development Workflow

### 1. Start Backend Server
```bash
cd backend
npm install
npm run dev
```
Backend will run on `http://localhost:5000`

### 2. Start Frontend Server
```bash
# In root directory
npm install
npm run dev
```
Frontend will run on `http://localhost:3000`

### 3. Environment Variables
Create `.env.local` in root directory:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
# ... other Firebase config
```

## Debugging Steps

1. **Check if backend is running**:
   - Visit `http://localhost:5000/health` in browser
   - Should return: `{"status":"ok","message":"Academic Universe Backend is running"}`

2. **Check browser console**:
   - Look for network errors
   - Check if requests are being made to correct URL

3. **Verify API routes**:
   - Backend routes: `/api/auth/*`, `/api/marks/*`
   - Frontend makes requests to: `http://localhost:5000/api/auth/firebase-login`

## Common Issues

### Issue: "Failed to fetch" or "Network Error"
- **Cause**: Backend server not running
- **Fix**: Start backend server with `npm run dev` in backend directory

### Issue: CORS Error
- **Cause**: Frontend and backend on different ports without CORS setup
- **Fix**: Already handled in backend CORS configuration

### Issue: 404 Not Found
- **Cause**: API route doesn't exist or backend not running
- **Fix**: Verify backend is running and route exists

## Production Deployment

For production, update `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com
```

## Testing API Endpoints

You can test backend endpoints directly:
```bash
# Test health endpoint
curl http://localhost:5000/health

# Test login (example)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```