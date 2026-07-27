# GitHub API Integration Setup

## Overview
This guide explains how to set up the GitHub API integration for fetching student project statistics in the Academic Universe application.

## Prerequisites
- GitHub account
- Node.js and npm installed
- MongoDB database running
- Firebase project configured

## Setup Instructions

### 1. Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Academic Universe API")
4. Select scopes:
   - `public_repo` (to read public repository information)
   - `read:user` (to read user profile information)
5. Click "Generate token"
6. **Copy the token immediately** - you won't be able to see it again

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory with the following content:

```env
# Backend Configuration
MONGODB_URI=mongodb://localhost:27017/academic_universe
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRY=7d
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

# GitHub API Configuration
GITHUB_TOKEN=your_github_personal_access_token_here
```

Replace `your_github_personal_access_token_here` with the token you generated in step 1.

### 3. Update User Profiles

Students need to have their GitHub username set in their profile. This can be done through:

1. The user profile update endpoint
2. Direct database update
3. Admin panel (if available)

Example user document structure:
```json
{
  "name": "John Doe",
  "email": "john.doe@university.edu",
  "githubUsername": "johndoe",
  "roleId": "student_role_id",
  "organizationId": "university_id"
}
```

### 4. Project Classification

Projects are classified based on GitHub repository topics:

- **Completed Projects**: Repositories with the topic `completed`
- **Ongoing Projects**: Repositories with the topic `ongoing`
- **Unclassified**: Repositories without these topics are not counted

To classify your projects:
1. Go to your GitHub repository
2. Click on "Topics" section
3. Add `completed` or `ongoing` as appropriate

### 5. API Endpoints

#### Get Project Statistics
```
GET /api/github/projects
```
**Headers:**
- `Authorization: Bearer <firebase_id_token>`

**Response:**
```json
{
  "success": true,
  "message": "Project statistics retrieved successfully",
  "data": {
    "totalProjects": 15,
    "projectsCompleted": 8,
    "projectsOngoing": 5,
    "githubUsername": "johndoe",
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Refresh Project Statistics
```
POST /api/github/projects/refresh
```
**Headers:**
- `Authorization: Bearer <firebase_id_token>`

**Response:**
```json
{
  "success": true,
  "message": "Project statistics refreshed successfully",
  "data": {
    "totalProjects": 15,
    "projectsCompleted": 8,
    "projectsOngoing": 5,
    "githubUsername": "johndoe",
    "lastUpdated": "2024-01-15T10:35:00.000Z"
  }
}
```

## Error Handling

### Common Error Responses

**Missing GitHub Username (400)**
```json
{
  "success": false,
  "message": "GitHub username not configured",
  "error": "Please set your GitHub username in your profile settings",
  "code": "GITHUB_USERNAME_MISSING"
}
```

**GitHub API Rate Limit (429)**
```json
{
  "success": false,
  "message": "Service temporarily unavailable",
  "error": "GitHub API rate limit exceeded. Please try again later.",
  "retryAfter": "30 minutes"
}
```

**GitHub User Not Found (502)**
```json
{
  "success": false,
  "message": "External service error",
  "error": "GitHub user 'username' not found",
  "code": "GITHUB_API_ERROR"
}
```

## Security Considerations

1. **Token Security**: Never expose the GitHub personal access token in client-side code
2. **Rate Limiting**: The service implements caching to reduce API calls
3. **Authentication**: All endpoints require valid Firebase authentication
4. **Authorization**: Only students can access their own project statistics
5. **CORS**: Proper CORS configuration prevents unauthorized frontend access

## Caching Strategy

- **Cache Duration**: 5 minutes
- **Cache Key**: `github:{username}`
- **Cache Invalidation**: Manual refresh endpoint available
- **Automatic Refresh**: Cache automatically expires after TTL

## Testing

### Test with curl:
```bash
# Get project stats
curl -X GET http://localhost:5000/api/github/projects \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"

# Refresh stats
curl -X POST http://localhost:5000/api/github/projects/refresh \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Test with Postman:
1. Set method to GET/POST
2. Set URL to `http://localhost:5000/api/github/projects`
3. Add Authorization header with Bearer token
4. Send request

## Troubleshooting

### 1. "GitHub username not configured"
- Ensure the user has `githubUsername` field in their database document
- Verify the username is correctly spelled and exists on GitHub

### 2. "GitHub API rate limit exceeded"
- Wait for 30 minutes for rate limit to reset
- Consider using a different GitHub token
- Check if multiple users are sharing the same token

### 3. "Authentication required"
- Ensure valid Firebase ID token is provided
- Check if token has expired and needs refresh

### 4. "Access denied"
- Verify user has STUDENT role
- Check role assignment in database

## Development Notes

### Backend Structure:
```
backend/src/
├── controllers/
│  └── githubController.ts     # Request handling logic
├── services/
│  └── githubService.ts        # GitHub API integration
├── routes/
│   └── githubRoutes.ts         # API route definitions
├── middleware/
│   └── auth.ts                 # Authentication middleware
└── models/
    └── User.ts                 # User model with githubUsername
```

### Frontend Component:
```
components/
└── GitHubProjects.tsx          # React component for displaying stats
```

### Dependencies:
- `axios`: For HTTP requests to GitHub API
- Firebase Admin SDK: For token verification
- Mongoose: For database operations

## Future Enhancements

1. **Webhook Integration**: Real-time updates when repositories are modified
2. **Detailed Project Information**: Show repository descriptions and languages
3. **Contribution Statistics**: Lines of code, commits, and activity metrics
4. **Multiple GitHub Accounts**: Support for linking multiple GitHub profiles
5. **Project Filtering**: Filter by language, date, or other criteria
6. **Export Functionality**: Export project data as PDF or CSV

## Support

For issues or questions regarding the GitHub integration:
1. Check the error logs in the backend console
2. Verify environment variables are correctly set
3. Ensure the GitHub token has proper permissions
4. Confirm the user's GitHub username is correct