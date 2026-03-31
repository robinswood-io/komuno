---
title: "Guide Frontmatter Documentation"
date: 2026-02-10
author: "Robinswood AI"
---

# Guide Frontmatter Documentation

## Overview

All Markdown documentation files in this project must include YAML frontmatter metadata at the beginning of the file. This ensures consistent documentation standards across the workspace and enables automated validation.

## Required Format

Every `.md` file in the documentation directories must start with:

```yaml
---
title: "Document Title"
date: YYYY-MM-DD
author: "Author Name"
---
```

## Field Specifications

### title (REQUIRED)
- Type: String
- Description: The human-readable title of the document
- Example: `title: "Getting Started Guide"`

### date (REQUIRED)
- Type: String (ISO 8601 format)
- Format: YYYY-MM-DD (e.g., 2026-02-10)
- Description: Creation or last update date
- Validation: Must be a valid date in YYYY-MM-DD format

### author (RECOMMENDED)
- Type: String
- Description: Name of the document author or maintainer
- Example: `author: "John Doe"`

### tags (OPTIONAL)
- Type: Array of strings
- Description: Keywords or categories for the document
- Example: `tags: [tutorial, setup, configuration]`

### status (OPTIONAL)
- Type: String
- Allowed values: draft, published, deprecated
- Description: Current status of the document

## Complete Example

```yaml
---
title: "Installation Guide"
date: 2026-02-10
author: "Jane Smith"
tags: [installation, setup, prerequisites]
status: published
---

# Installation Guide

## Prerequisites

Before you begin...
```

## Automatic Validation

A Git pre-commit hook automatically validates frontmatter when you commit documentation files.

### What Gets Validated

- Presence of frontmatter YAML block (--- delimiters)
- Required fields: title, date
- Date format validation (YYYY-MM-DD)

### When Validation Runs

Validation occurs automatically when you:

```bash
git add docs/your-file.md
git commit -m "docs: add documentation"
```

The hook will validate the file before allowing the commit to proceed.

## Common Issues and Solutions

### Issue: "Missing frontmatter YAML"

**Symptom:**
```
⚠️  WARNING: docs/file.md missing frontmatter YAML
```

**Solution:**
Add the frontmatter block at the very beginning of your file:

```yaml
---
title: "Your Title"
date: 2026-02-10
author: "Your Name"
---
```

### Issue: "Missing required field 'title'"

**Symptom:**
```
❌ ERROR: docs/file.md missing required field 'title'
```

**Solution:**
Add the `title` field to your frontmatter:

```yaml
---
title: "Document Title"
date: 2026-02-10
author: "Your Name"
---
```

### Issue: "Invalid date format"

**Symptom:**
```
❌ ERROR: docs/file.md has invalid date format '2026/02/10'
Expected format: YYYY-MM-DD (e.g., 2026-02-10)
```

**Solution:**
Use the correct ISO 8601 format (YYYY-MM-DD):

```yaml
---
title: "Document Title"
date: 2026-02-10
author: "Your Name"
---
```

## Documenting Files

Documentation files are automatically validated in these directories:

- `docs/` - Primary documentation directory
- `documentation/` - Secondary documentation directory
- `bmad/` - BMAD (Build, Metrics, Analysis, Deployment) documentation
- `README*.md` - Root-level readme files
- `CHANGELOG*.md` - Changelog files

## Testing the Hook Manually

To test the hook without committing:

```bash
# Create a test file
echo "# Test" > docs/test.md

# Stage it
git add docs/test.md

# Attempt to commit
git commit -m "test: documentation validation"

# The hook will guide you to fix any issues
```

## Disabling the Hook (Not Recommended)

If absolutely necessary, you can bypass the hook with:

```bash
git commit --no-verify -m "Your message"
```

**Note:** This is not recommended as it defeats the purpose of validation.

## Best Practices

1. **Always fill in author field** - Makes it clear who maintains the document
2. **Use meaningful titles** - Helps with searchability and clarity
3. **Keep dates current** - Update the date when you modify a document
4. **Add tags** - Helps categorize and organize documentation
5. **Commit frequently** - The validation runs on each commit, catching issues early

## Support

For issues or questions about documentation standards:

1. Check this guide for common solutions
2. Review existing documentation in `docs/` for examples
3. Contact the Robinswood AI team for assistance

---

**Last Updated:** 2026-02-10
**Maintained By:** Robinswood AI
