# Tenancy & Authorization Plan

## Objective
Define the smallest safe tenancy authorization plan that addresses confirmed tenant risks without a broad greenfield TenantContext rewrite.

## Verified current reality
- `authenticateUser` attaches `req.user` and `req.organizationId`.
- `enforceOrgIsolation` exists and validates `organizationId` in request body or params.
- High-risk flows currently bypass organization validation on direct `findById` reads.

## Target constraint
- Use the frozen audit state and compatibility matrix as the authoritative source for tenancy constraints.
- Do not invent missing TenantContext contract requirements.

## Plan elements
1. High-risk flow boundary definition
   - Identify the minimal set of controllers and services where external input selects tenant-owned resources by ID.
   - Include evidenced flows: Gmail callback, resume template generation, and any direct `User.findById(userId)` from untrusted external input.

2. Authorization check pattern
   - Prefer post-read ownership validation when resources are fetched by ID.
   - Example pattern: verify `resource.organizationId.toString() === req.user.organizationId` after `findById`.
   - Use `enforceOrgIsolation` only where request payload includes `organizationId`; do not force repository-layer refactor.

3. Tenant sweep scope for Sprint 1
   - IN_SCOPE: documented safety boundary for the top audit findings and any sibling flows that are low-effort to validate.
   - OUT_OF_SCOPE: repository-wide `TenantContext` interface migration.
   - CONDITIONAL: remaining low-priority `findById` cases if review reveals additional authenticated external-ID exposures.

4. Minimal migration path
   - Start with an authorization contract document specifying when `organizationId` must be asserted.
   - Leverage existing `authenticateUser` / `req.organizationId` instead of introducing new tenancy middleware.

## Deliverables
- A tenancy authorization checklist for Sprint 1.
- A decision table showing when post-read ownership checks are required versus when existing `enforceOrgIsolation` is sufficient.
- A scoped list of candidate controllers/services for Sprint 1 review.

## Risk notes
- If the missing Technical Contract would require a different tenancy model, the plan marks those dependency decisions as BLOCKED.
- This plan does not assume broader multi-tenant interface changes beyond the existing route and controller evidence.
