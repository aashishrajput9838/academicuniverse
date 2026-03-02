# Academic Universe Overlap Engine

A scalable, section-based overlap engine that finds common free time slots across multiple sections using precomputed free slots and exact slot matching.

##🎯 Features

- **Multi-tenant Architecture**: Secure organization-level data isolation
- **RBAC Security**: Role-based access control with Firebase Authentication
- **Precomputed Slots**: Efficient slot calculation using precomputed free slots
- **Exact Slot Matching**: Deterministic algorithm for precise time slot intersection
- **Real-time Results**: Fast overlap calculation with immediate feedback
- **Responsive UI**: Modern React interface with dark mode support

##🏗️ Architecture

### Backend (Node.js + Express)
- **Authentication**: Firebase Authentication with JWT middleware
- **Database**: Firestore for precomputed slot data
- **Security**: Multi-tenant RBAC with organization isolation
- **Algorithm**: Set-based intersection for O(n × k) performance

### Frontend (Next.js + React)
- **UI Components**: Shadcn/ui component library
- **State Management**: React hooks for local state
- **API Integration**: Dedicated overlap API service
- **Responsive Design**: Mobile-first approach with Tailwind CSS

##📁 Project Structure

```
backend/src/
├── controllers/
│  └── overlapController.ts      # API endpoint handlers
├── routes/
│   └── overlapRoutes.ts          # Route definitions
├── services/
│   └── overlapService.ts          # Core overlap logic
└── config/
    └── firebaseAdmin.ts          # Firebase configuration

app/dashboard/student/
└── overlap/
   └── page.tsx                   # Main UI component

utils/api/
└── overlapAPI.ts                 # API service layer

firestore.rules                   # Security rules
```

##🚀 API Endpoints

### `GET /api/overlap-engine/sections`
Get available sections for organization.

**Query Parameters:**
- `organizationId` (required) - Organization identifier

**Response:**
```json
{
  "success": true,
  "message": "Available sections retrieved successfully",
  "data": {
    "sections": [
      {
        "_id": "section_I",
        "sectionName": "Section I",
        "organizationId": "org-123"
      }
    ],
    "organizationId": "org-123",
    "count": 1
  }
}
```

### `POST /api/overlap-engine/sections`
Calculate overlap slots for selected sections.

**Request Body:**
```json
{
  "sections": ["section_I", "section_C"],
  "organizationId": "org-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Overlap slots calculated successfully",
  "data": {
    "sections": ["section_I", "section_C"],
    "organizationId": "org-123",
    "overlapSlots": {
      "Monday": [
        { "start": "11:35", "end": "12:25" },
        { "start": "12:25", "end": "13:15" }
      ],
      "Tuesday": [
        { "start": "09:00", "end": "09:50" }
      ]
    },
    "totalDays": 2,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

##🛡 Security

### Multi-tenant Access Control
- **Organization Isolation**: Users can only access data within their organization
- **RBAC Permissions**: Different access levels for students, faculty, and admins
- **Firebase Authentication**: Secure token-based authentication
- **Firestore Security Rules**: Database-level access control

### Core Security Rules
```
- Authenticated users only
- All sections must belong to same organization
- Maximum 5 sections per request
- Organization-level data isolation
- Super admin override capabilities
```

##⚙ Global Time Slot Configuration

```typescript
const TIME_SLOTS = [
  { index: 0, start: "09:00", end: "09:50" },
  { index: 1, start: "09:50", end: "10:40" },
  { index: 2, start: "10:40", end: "11:30" },
  { index: 3, start: "11:35", end: "12:25" },
  { index: 4, start: "12:25", end: "13:15" },
  { index: 5, start: "13:15", end: "14:05" },
  { index: 6, start: "14:10", end: "15:00" },
  { index: 7, start: "15:00", end: "15:50" },
  { index: 8, start: "15:50", end: "16:40" }
];
```

##🔧 Database Schema

### Sections Collection
```
sections/{sectionId}
├── organizationId: string
├── sectionName: string
└── representativeUid: string
```

### Timetables Collection
```
timetables/{sectionId}
├── organizationId: string
└── weeklyOccupiedSlots: {
    "Monday": [0, 1, 2],
    "Tuesday": []
  }
```

### FreeSlots Collection
```
freeSlots/{sectionId}
├── organizationId: string
└── weeklyFreeSlots: {
    "Monday": [3, 4, 5],
    "Tuesday": [0, 1]
  }
```

## 📊 Algorithm Performance

### Time Complexity
- **Slot Intersection**: O(n × k) where n = days, k = slots per day
- **Set Operations**: O(k) for each day intersection
- **Precomputed Slots**: Eliminates repeated slot calculations

### Space Complexity
- **Memory Usage**: O(n × k) for storing free slots
- **Cache Efficiency**: Firestore query results caching
- **Request Optimization**: Single request per calculation

## 🎨 User Interface Features

### Section Selection
- **Multi-select Interface**: Up to 5 sections at a time
- **Visual Feedback**: Clear selection indicators
- **Validation**: Automatic selection limits
- **Real-time Updates**: Live counter for selected sections

### Result Display
- **Day-by-Day Layout**: Clear organization of results
- **Time Block Visualization**: Color-coded free slots
- **Responsive Grid**: Adaptive layout for different screen sizes
- **Empty States**: Helpful messaging when no overlaps exist

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Compatible**: ARIA labels and semantic HTML
- **Contrast Ratio**: WCAG 2.1 AA compliance
- **Loading States**: Clear feedback during processing

##🧪 Testing Strategy

### Edge Cases Handled
- Empty section selection
- Non-existent sections
- Cross-organization attempts
- Database connection failures
- Authentication errors
- Invalid section IDs

### Performance Testing
- **Large Section Sets**: Test with 5-section maximum
- **Sparse Timetables**: Handle mostly empty schedules
- **Edge Case Data**: Empty results, all days filled
- **Load Testing**: Multiple concurrent users

##🚀 Deployment Considerations

### Production Readiness
- **Rate Limiting**: Implement request rate limiting
- **Caching**: Redis or Memcached for frequently accessed data
- **Monitoring**: Comprehensive logging and error tracking
- **Auto-scaling**: Kubernetes deployment with autoscaling rules
- **CI/CD**: Automated testing and deployment pipeline

### Security Best Practices
- **Input Sanitization**: XSS protection
- **Query Security**: Firestore rules deployment
- **Audit Logging**: Security events and user actions
- **Dependency Updates**: Regular security updates
- **TLS Encryption**: End-to-end encrypted communication

##🛠️ Getting Started

### Backend Setup
1. Configure `.env` file with Firebase credentials
2. Start MongoDB with mock data
3. Deploy to configured platform:
```bash
npm run dev
# Available at http://localhost:5000
```

### Frontend Setup
```bash
cd frontend && npm run dev
# Available at http://localhost:3000
# Navigate to: /dashboard/student/overlap
```

### Configuration
- Configure FIREBASE variables in both `backend/src/.env` 
- Set required ADMIN variables
- Configure next variable in  
- Deploy Firestore security rules

##📈 & Analytics

### Key Metrics
- **Usage Statistics**: Section selection patterns
- **Performance Metrics**: Response times and success rates
- **Error Tracking**: Failed requests and user feedback
- **User Engagement**: Feature adoption and satisfaction

### Logging Strategy
- **Request Logging**: API endpoint usage tracking
- **Error Logging**: Detailed error information for debugging
- **Performance Logging**: Response time and resource usage
- **Security Logging**: Authentication attempts and access control

##🤝 Contributing

### Development Guidelines
- **Code Style**: Follow existing TypeScript and React patterns
- **Testing**: Comprehensive unit and integration tests
- **Documentation**: Clear inline comments and API documentation
- **Security**: Regular security reviews and updates

### Branch Strategy
- **Main**: Production-ready code
- **Development**: Active development branch
- **Feature Branches**: Individual feature development
- **Hotfix**: Critical bug fixes

##📞 Support

### Documentation
- **API Documentation**: Comprehensive endpoint documentation
- **User Guides**: Step-by-step usage instructions
- **Troubleshooting**: Common issues and solutions
- **Security Guidelines**: Best practices and compliance

### Contact
- **Development Team**: Available for technical questions
- **Security Issues**: Dedicated security response team
- **Feature Requests**: Product management team
- **Bug Reports**: Issue tracking system

---

*Built with ❤️ for Academic Universe - Empowering education through technology*