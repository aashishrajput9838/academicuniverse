# Rollback Guide

## When to Rollback
- Production defect discovered in Sprint-021 RC-001
- Unplanned service degradation
- Data integrity issue in resume generation

## Rollback Procedure

### 1. Identify Last Stable Commit
\`\`\`bash
git log --oneline -20
\`\`\`

### 2. Revert Tag
\`\`\`bash
git tag -d sprint-021-rc1
git push origin :refs/tags/sprint-021-rc1
\`\`\`

### 3. Revert Code (if needed)
\`\`\`bash
git revert <commit-hash>
git push origin main
\`\`\`

### 4. Redeploy
\`\`\`bash
npm run build
npm run start:prod
\`\`\`

## Post-Rollback Verification
- Run regression tests
- Verify health endpoints
- Confirm template processing with 1 sample template
