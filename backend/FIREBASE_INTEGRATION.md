# Firebase Integration for Academic Universe

This document describes the Firebase integration with automatic role detection for the Academic Universe platform.

## 🎯 Overview

The backend now integrates with Firebase Authentication to provide:
- **Automatic role detection** based on institutional email domains
- **Secure token verification** using Firebase Admin SDK
- **Role-based access control** with permissions tied to email domains
- **Multi-tenant architecture** with organization isolation

## 🔐 Role Detection Rules

The system automatically assigns roles based on institutional email domains:

| Email Domain Pattern | Assigned Role | Permissions |
|---------------------|---------------|-------------|
| `*@ug.sharda.ac.in` | STUDENT | `VIEW_DASHBOARD`, `VIEW_OWN_MARKS` |
| `*@fa.sharda.ac.in` | FACULTY | `VIEW_DASHBOARD`, `ADD_MARKS`, `VIEW_ALL_MARKS`, `EDIT_MARKS` |
| `*@pg.sharda.ac.in` | STUDENT | `VIEW_DASHBOARD`, `VIEW_OWN_MARKS` |
| Other domains | Rejected | Access Denied |

## 🏗️ Architecture

### Backend Services Added

1. **Firebase Admin Configuration** (`src/config/firebaseAdmin.ts`)
   - Initializes Firebase Admin SDK
   - Provides access to Firebase Auth and Firestore services

2. **Role Detection Service** (`src/services/roleDetectionService.ts`)
   - Contains core logic for email domain-based role assignment
   - Provides helper functions for role validation

3. **Enhanced Authentication Service** (`src/services/authService.ts`)
   - Updated `loginWithFirebase` function to verify Firebase tokens
   - Integrates role detection with user creation/lookup
   - Maintains compatibility with existing JWT-based system

4. **Extended Authentication Middleware** (`src/middleware/auth.ts`)
   - Added `authenticateFirebaseUser` middleware
   - Enables Firebase token verification alongside existing JWT verification

## 🚀 API Endpoints

### Firebase Login
- **Endpoint**: `POST /api/auth/firebase-login`
- **Request Body**:
  ```json
  {
    "idToken": "firebase_id_token_here"
  }
  ```
- **Process**:
  1. Verifies Firebase ID token using Firebase Admin SDK
  2. Extracts email from token
  3. Detects role based on email domain
  4. Creates/updates user in MongoDB
  5. Generates JWT with detected role and permissions
  6. Returns user info with assigned role

### Response Format
```json
{
  "success": true,
  "message": "Firebase login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_object_id",
      "name": "user_name",
      "email": "user@domain.sharda.ac.in",
      "organization": "sharda_main",
      "role": "STUDENT",
      "permissions": ["VIEW_DASHBOARD", "VIEW_OWN_MARKS"]
    }
  }
}
```

## 🔧 Implementation Details

### Role Detection Logic
1. Email normalization (lowercase, trim)
2. Domain validation against `sharda.ac.in`
3. Subdomain extraction (`ug`, `fa`, `pg`)
4. Role assignment based on subdomain
5. Permission assignment based on role

### Security Measures
- **Never trust client-side role claims**
- **Always verify Firebase tokens server-side**
- **Email domain validation before role assignment**
- **Organization isolation maintained**
- **JWT tokens contain verified role information**

### Backward Compatibility
- Existing email/password authentication continues to work
- Existing JWT-based system remains unchanged
- New Firebase integration adds functionality without breaking existing features

## 🧪 Testing

The role detection service has been thoroughly tested with:
- Valid institutional email domains
- Invalid email domains (proper rejection)
- Case-insensitive email handling
- All defined role mappings

## 📱 Frontend Integration

### Login Flow
1. User authenticates with Firebase (Google Sign-In, etc.)
2. Frontend receives Firebase ID token
3. Frontend sends token to backend: `/api/auth/firebase-login`
4. Backend verifies token and assigns role based on email
5. Backend returns JWT with role and permissions
6. Frontend uses JWT for subsequent API calls

### Example Frontend Code
```javascript
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const handleFirebaseLogin = async () => {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  
  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    
    // Send to backend for role assignment
    const response = await fetch('http://localhost:5000/api/auth/firebase-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken })
    });
    
    const data = await response.json();
    console.log('User role:', data.data.user.role);
    
    // Store JWT and redirect based on role
    localStorage.setItem('token', data.data.token);
    
    if (data.data.user.role === 'STUDENT') {
      // Navigate to student dashboard
    } else if (data.data.user.role === 'FACULTY') {
      // Navigate to faculty dashboard
    }
  } catch (error) {
    console.error('Login error:', error);
  }
};
```

## 🚨 Important Notes

1. **Email Domains**: Only emails from `sharda.ac.in` subdomains are accepted
2. **Role Permanence**: Roles are permanently determined by email domain and cannot be manually edited
3. **Security**: All role assignments happen server-side after token verification
4. **Organization**: All users are assigned to the `sharda_main` organization by default

## 📋 Next Steps

- Update frontend to use the new Firebase login endpoint
- Implement role-based UI components
- Add additional institutional email domains as needed
- Enhance error handling and user feedback