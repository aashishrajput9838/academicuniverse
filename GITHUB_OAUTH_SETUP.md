# GitHub OAuth Setup Guide

This guide explains how to set up GitHub OAuth for the Academic Universe application to enable secure developer analytics.

## Prerequisites

- Academic Universe backend server running
- GitHub account with admin access to create OAuth applications

## Step 1: Create GitHub OAuth Application

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the following details:
   - **Application name**: Academic Universe
   - **Homepage URL**: `http://localhost:3000` (or your production URL)
   - **Authorization callback URL**: `http://localhost:5000/api/github/callback`

4. Click "Register application"

## Step 2: Configure Environment Variables

After creating the OAuth app, you'll receive a Client ID and Client Secret. Update your `.env` file:

```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
SESSION_SECRET=your_secure_session_secret_here
ENCRYPTION_KEY=your_32_byte_hex_encryption_key_here  # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"
```

## Step 3: Restart the Backend Server

After updating the environment variables, restart your backend server:

```bash
cd backend
npm run dev
```

## Step 4: Usage

Users can now connect their GitHub accounts through the UI:

1. Navigate to the GitHub Projects section
2. Click "Connect with GitHub" button
3. Authorize the OAuth application in the popup window
4. The application will securely store the encrypted access token
5. Developer analytics will be processed and displayed

## Features

- **Secure OAuth Flow**: Uses state parameter to prevent CSRF attacks
- **Encrypted Token Storage**: GitHub access tokens are encrypted before storing
- **Comprehensive Analytics**: Provides detailed developer statistics:
  - Total repositories (public and private)
  - Language distribution
  - Commit activity
  - Star and fork counts
  - Repository growth trends
- **Scheduled Sync**: Updates analytics periodically
- **Secure Session Management**: Proper session handling for OAuth flow

## Security Measures

- All GitHub tokens are encrypted using AES-256-CBC
- Tokens are never exposed to the frontend
- State parameter prevents CSRF attacks
- Proper session management
- Role-based access control (STUDENT role required)

## Troubleshooting

### OAuth Callback Issues
- Ensure the Authorization callback URL matches exactly what you registered in GitHub
- Check that the backend server is accessible at the specified URL

### Token Encryption Issues
- Verify that ENCRYPTION_KEY is a valid 32-byte hex string
- Ensure the environment variable is properly loaded

### Session Issues
- Make sure SESSION_SECRET is set to a secure value
- Verify that CORS settings allow communication between frontend and backend