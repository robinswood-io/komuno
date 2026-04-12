# CRM Routes Conflict Issue

**Date:** 2026-01-26
**Status:** 🔴 CRITICAL - Blocking E2E Tests
**Priority:** HIGH

---

## Executive Summary

A routing conflict prevents the CRM tags/tasks/relations endpoints from functioning. When accessing `/api/admin/members/tags`, NestJS routes the request to `AdminMembersController.getMemberByEmail(:email)` instead of `AdminMemberTagsController.getAllTags()`, treating "tags" as an email parameter.

---

## Root Cause

### Conflicting Route Patterns

**AdminMembersController** (server/src/members/members.controller.ts:59)
```typescript
@Controller('api/admin/members')
export class AdminMembersController {

  @Get(':email/tags')  // Line 244
  async getMemberTags(@Param('email') email: string) {
    // Get tags FOR A SPECIFIC MEMBER
  }

  @Post(':email/tags')  // Line 257
  async assignTagToMember(@Param('email') email: string, @Body() body: unknown) {
    // Assign tag TO A SPECIFIC MEMBER
  }
}
```

**AdminMemberTagsController** (server/src/members/members.controller.ts:390)
```typescript
@Controller('api/admin/members/tags')  // ❌ CONFLICTS!
export class AdminMemberTagsController {

  @Get()  // Line 395
  async getAllTags() {
    // Get ALL TAGS (global management)
  }

  @Post()  // Line 406
  async createTag(@Body() body: unknown) {
    // Create NEW TAG (global management)
  }
}
```

### Why It Conflicts

When a request comes to `/api/admin/members/tags`:
1. NestJS checks `AdminMembersController` first
2. It matches the pattern `/api/admin/members/:email/*`
3. It interprets "tags" as the `:email` parameter value
4. It routes to `getMemberByEmail()` or `getMemberTags()`
5. These methods expect an email, not "tags"
6. Result: `NotFoundException: Membre non trouvé`

The `AdminMemberTagsController` with `/api/admin/members/tags` never gets a chance to handle the request.

---

## Impact

### Failed E2E Tests
- ❌ 12/15 tests failing in `crm-members-tags.spec.ts`
- ❌ API calls return 404 instead of 200
- ❌ Frontend pages show "0 tags" with disabled buttons
- ❌ Similar issues expected for tasks and relations

### Affected Endpoints

**Tags** (9 endpoints affected)
- `GET /api/admin/members/tags` → conflicts with `:email`
- `POST /api/admin/members/tags` → conflicts with `:email`
- `PATCH /api/admin/members/tags/:id` → conflicts with `:email`
- `DELETE /api/admin/members/tags/:id` → conflicts with `:email`

**Tasks** (2 endpoints affected)
- `PATCH /api/admin/members/tasks/:id` → conflicts with `:email`
- `DELETE /api/admin/members/tasks/:id` → conflicts with `:email`

**Relations** (1 endpoint affected)
- `DELETE /api/admin/members/relations/:id` → conflicts with `:email`

---

## Solution

### Recommended: Use Separate Route Paths

Change the global management controllers to use distinct, non-conflicting paths:

```typescript
// CURRENT (CONFLICTS)
@Controller('api/admin/members/tags')      // ❌ Conflicts with :email
@Controller('api/admin/members/tasks')     // ❌ Conflicts with :email
@Controller('api/admin/members/relations') // ❌ Conflicts with :email

// RECOMMENDED (NO CONFLICTS)
@Controller('api/admin/tags')        // ✅ Clean separation
@Controller('api/admin/tasks')       // ✅ Clean separation
@Controller('api/admin/relations')   // ✅ Clean separation
```

This provides:
- ✅ No route conflicts
- ✅ Clearer API semantics (global vs. member-specific)
- ✅ More RESTful design
- ✅ Easier to understand and maintain

### Files Requiring Changes

#### Backend (3 files)
1. **server/src/members/members.controller.ts**
   - Line 390: `@Controller('api/admin/tags')`
   - Line 469: `@Controller('api/admin/tasks')`
   - Line 522: `@Controller('api/admin/relations')`

#### Frontend (3 pages)
2. **app/(protected)/admin/members/tags/page.tsx**
   - Update API calls from `/api/admin/members/tags` → `/api/admin/tags`

3. **app/(protected)/admin/members/tasks/page.tsx**
   - Update API calls from member-tasks → `/api/admin/tasks`

4. **app/(protected)/admin/members/relations/page.tsx**
   - Update API calls from member-relations → `/api/admin/relations`

#### E2E Tests (6 files)
5. **tests/e2e/e2e/crm-members-tags.spec.ts**
   - Update BASE_URL or API paths

6. **tests/e2e/e2e/crm-members-tasks.spec.ts**
   - Update BASE_URL or API paths

7. **tests/e2e/e2e/crm-members-relations.spec.ts**
   - Update BASE_URL or API paths

8. **tests/e2e/e2e/crm-members-stats.spec.ts**
   - Verify API paths (if affected)

9. **tests/e2e/e2e/crm-members-export.spec.ts**
   - Verify API paths (if affected)

10. **tests/e2e/e2e/crm-members-details-sheet.spec.ts**
    - Verify API paths (if affected)

---

## Alternative Solutions (Not Recommended)

### Option 2: Use Different Controller Names
```typescript
@Controller('api/admin/member-tags')  // Singular, but conflicts with frontend expectation
```
- ❌ Requires updating all frontend pages
- ❌ Requires updating all 86 E2E tests
- ❌ Less intuitive naming

### Option 3: Change Route Order in NestJS
- ❌ Fragile, depends on module registration order
- ❌ Hard to maintain
- ❌ Not guaranteed to work

---

## Implementation Steps

### Phase 1: Backend Routes (Immediate)
1. Update 3 controller `@Controller()` decorators
2. Verify TypeScript compilation: `npx tsc --noEmit`
3. Wait for hot reload (~5 seconds)
4. Test with curl: `curl https://cjd80.rbw.ovh/api/admin/tags`

### Phase 2: Frontend Updates
5. Update tags page API calls
6. Update tasks page API calls
7. Update relations page API calls
8. Verify pages load correctly in browser

### Phase 3: Test Updates
9. Update 6 test files with new API paths
10. Run tests: `npx playwright test tests/e2e/e2e/crm-*.spec.ts`
11. Verify all tests pass

### Phase 4: Verification
12. Full E2E test suite: `npx playwright test`
13. Generate HTML report
14. Commit all changes

---

## Current Status

### What's Committed
- ✅ 86 E2E tests created
- ✅ RBAC permissions fixed (10 endpoints)
- ✅ Navigation menu added
- ✅ User documentation created
- ✅ All commits pushed to remote

### What's Broken
- ❌ `/api/admin/members/tags` returns 404
- ❌ `/api/admin/members/tasks/:id` returns 404
- ❌ `/api/admin/members/relations/:id` returns 404
- ❌ E2E tests failing (12/15 in tags alone)
- ❌ Frontend pages non-functional (disabled buttons)

### Pending Changes (Uncommitted)
- playwright.config.ts: Updated to use .rbw.ovh URLs
- members.controller.ts: Attempted route fixes (incomplete)

---

## Recommendation

**Action:** Implement the recommended solution (separate route paths) as it provides the cleanest, most maintainable architecture. This will require coordinated updates across backend, frontend, and tests, but eliminates the root cause of the conflict permanently.

**Estimated Time:** 1-2 hours
- Backend changes: 15 minutes
- Frontend changes: 30 minutes
- Test updates: 30 minutes
- Verification: 15 minutes

**Risk Level:** LOW - Changes are straightforward and isolated to specific files

---

**Report Generated:** 2026-01-26
**Issue Discovered During:** E2E Test Execution
**Severity:** CRITICAL (Blocks all CRM functionality)
