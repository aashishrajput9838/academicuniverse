# Deployment Guide — Resume Generation Pipeline

## Prerequisites
- Node.js >= 18
- npm
- PostgreSQL (if using DB-backed storage)
- Cloudinary account (if using cloud storage)

## Deployment Steps

### 1. Clone and Install
\`\`\`bash
git clone https://github.com/org/academicuniverse.git
cd academicuniverse/backend
npm install
\`\`\`

### 2. Environment Variables
\`\`\`env
NODE_ENV=production
PORT=3000
JWT_SECRET=<secret>
DATABASE_URL=postgres://...
CLOUDINARY_URL=cloudinary://...
\`\`\`

### 3. Build
\`\`\`bash
npm run build
\`\`\`

### 4. Run Migrations (if applicable)
\`\`\`bash
npm run migration:run
\`\`\`

### 5. Start
\`\`\`bash
npm run start:prod
\`\`\`

## Health Checks
- `GET /health`
- `GET /api/health`

## Rollback
See `ROLLBACK-GUIDE.md`.
