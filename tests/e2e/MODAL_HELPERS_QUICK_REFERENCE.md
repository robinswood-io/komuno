# Modal Helpers - Quick Reference Guide

## Import & Location
File: `/srv/workspace/cjd80/tests/e2e/e2e/crm-members-tasks.spec.ts`
Lines: 53-79

These helpers are defined at the top of the test file, ready to use in any test.

---

## Helper 1: waitForModalReady()

### What it does
Waits for a modal to be fully visible and rendered before you interact with it.

### When to use
- After calling code that opens a modal (clicking a button)
- Before filling form fields in a modal
- Before submitting a modal form

### Usage
```typescript
const createButton = page.locator('button').filter({ hasText: /créer/i }).first();
await createButton.click();
await waitForModalReady(page);  // <- Wait here

// Now safe to fill form
const titleInput = page.locator('input[name="title"]').first();
await titleInput.fill('My Task');
```

### What it waits for
1. Modal element with `role="dialog"` exists and is visible
2. CSS animations complete (300ms buffer)
3. Form elements are interactive

### Timeout
5 seconds - if modal doesn't appear, test fails

---

## Helper 2: clickModalSubmit()

### What it does
Safely clicks the submit button inside a modal. Handles:
- Finding button only within modal (not outside)
- Checking button is enabled before clicking
- Scrolling button into view if needed
- Waiting for animations to complete

### When to use
- After filling form fields in a modal
- To submit create/edit/delete modals
- Instead of manually locating and clicking submit buttons

### Usage
```typescript
// Basic usage - default button text
await clickModalSubmit(page);

// Custom button text (for edit/save scenarios)
await clickModalSubmit(page, /enregistrer|save/i);

// Or with string
await clickModalSubmit(page, 'Save Changes');
```

### Parameters

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| `page` | object | required | Playwright page object |
| `buttonText` | string \| RegExp | `/créer\|enregistrer\|save\|mettre à jour/i` | Text to match on button |

### Examples

**Create Task:**
```typescript
await clickModalSubmit(page);  // Finds "Créer" or "Enregistrer"
```

**Edit Task:**
```typescript
await clickModalSubmit(page, /enregistrer|save|mettre à jour/i);  // Finds "Enregistrer"
```

**Delete Confirmation:**
```typescript
await clickModalSubmit(page, /confirmer|supprimer/i);  // Finds "Confirmer"
```

### What it verifies
1. Modal is still visible
2. Submit button exists within modal
3. Button is visible on page
4. Button is enabled (not disabled)
5. Button is scrolled into viewport if needed
6. Animations complete before clicking

### Timeout
5 seconds per check - if button doesn't meet criteria, test fails

---

## Complete Example: Create & Edit Task

```typescript
test('Create and edit a task', async ({ page }) => {
  // STEP 1: Open create modal
  const createBtn = page.locator('button').filter({ hasText: /créer/i }).first();
  await createBtn.click();
  await waitForModalReady(page);  // <- Wait for modal
  
  // STEP 2: Fill form
  const titleInput = page.locator('input[name="title"]').first();
  await titleInput.fill('My Important Task');
  
  // STEP 3: Submit
  await clickModalSubmit(page);  // <- Safe submit
  await page.waitForTimeout(2000);
  
  // STEP 4: Open edit modal
  const editBtn = page.locator('button').filter({ hasText: /modifier/i }).first();
  await editBtn.click();
  await waitForModalReady(page);  // <- Wait for modal
  
  // STEP 5: Edit form
  const titleEdit = page.locator('input[name="title"]').first();
  await titleEdit.fill('Updated Task Title');
  
  // STEP 6: Submit with custom button text
  await clickModalSubmit(page, /enregistrer|save/i);  // <- Safe submit
  await page.waitForTimeout(2000);
});
```

---

## Common Mistakes & How to Avoid Them

### Mistake 1: Not waiting for modal
```typescript
// BAD
const createBtn = page.locator('button').filter({ hasText: /créer/i }).first();
await createBtn.click();
const titleInput = page.locator('input[name="title"]').first();
await titleInput.fill('Title');  // <- Modal might not be visible yet!

// GOOD
const createBtn = page.locator('button').filter({ hasText: /créer/i }).first();
await createBtn.click();
await waitForModalReady(page);  // <- Wait here
const titleInput = page.locator('input[name="title"]').first();
await titleInput.fill('Title');
```

### Mistake 2: Using generic button selectors
```typescript
// BAD - might click wrong button
const submitBtn = page.locator('button').filter({ hasText: 'Save' }).first();
await submitBtn.click();

// GOOD - uses helper with proper modal scoping
await clickModalSubmit(page, /save|enregistrer/i);
```

### Mistake 3: Forgetting modal animations
```typescript
// BAD - might click before modal is fully visible
const createBtn = page.locator('button').filter({ hasText: /créer/i }).first();
await createBtn.click();
const titleInput = page.locator('input[name="title"]').first();
await titleInput.fill('Title');  // <- Timing issue!

// GOOD - accounts for animations
const createBtn = page.locator('button').filter({ hasText: /créer/i }).first();
await createBtn.click();
await waitForModalReady(page);  // <- 300ms animation buffer
const titleInput = page.locator('input[name="title"]').first();
await titleInput.fill('Title');
```

---

## Troubleshooting

### "element is not visible"
- Check that `waitForModalReady(page)` is called after opening modal
- Modal might have display:none - check CSS/JavaScript

### "element is blocked by"
- Modal might be overlapped by another element
- `clickModalSubmit()` handles this with scrollIntoViewIfNeeded()
- Check z-index in browser DevTools

### "timeout waiting for element"
- Modal selector changed - verify `[role="dialog"]` still matches
- Animation delay might need increase - edit the 300ms in `waitForModalReady()`

### "button not found"
- Check button text matches the regex/string
- Use browser DevTools to verify exact button text
- Adjust regex pattern: `/nouveau|crear|add/i` for multiple languages

---

## Reference: Tests Using These Helpers

| Test | Helper Used | Line | Purpose |
|------|------------|------|---------|
| Test 8 | waitForModalReady + clickModalSubmit | 308, 350 | Create task |
| Test 11 | waitForModalReady + clickModalSubmit | 448, 458 | Edit task |
| Test 15 | waitForModalReady + clickModalSubmit | 569-599 | Full workflow |

---

## Future: Using Helpers in New Tests

To use these helpers in other test files, you have two options:

1. **Copy the helper functions** to the new test file
2. **Extract to shared utility file** (recommended for many test files)

Extract example:
```typescript
// helpers/modal.ts
export async function waitForModalReady(page: any) { ... }
export async function clickModalSubmit(page: any, buttonText?: string | RegExp) { ... }

// In test file:
import { waitForModalReady, clickModalSubmit } from '../helpers/modal';
```
