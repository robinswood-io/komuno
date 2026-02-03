#!/bin/bash

echo "=== TESTS MODULES CJD80 ==="
echo ""

# Événements
echo "1. MODULE ÉVÉNEMENTS"
npx playwright test tests/e2e/e2e/admin-events-inscriptions.spec.ts --reporter=list 2>&1 | grep -E "passed|failed|^\s+[0-9]+"| tail -5
echo ""

# Prêts
echo "2. MODULE PRÊTS"
npx playwright test tests/e2e/e2e/loans-management.spec.ts --reporter=list 2>&1 | grep -E "passed|failed|^\s+[0-9]+" | tail -5
echo ""

# Financier
echo "3. MODULE FINANCIER"
npx playwright test tests/e2e/e2e/admin-financial.spec.ts --reporter=list 2>&1 | grep -E "passed|failed|^\s+[0-9]+" | tail -5
echo ""

# Branding
echo "4. MODULE BRANDING"
npx playwright test tests/e2e/e2e/admin-branding.spec.ts --reporter=list 2>&1 | grep -E "passed|failed|^\s+[0-9]+" | tail -5
echo ""

# Tracking
echo "5. MODULE TRACKING"
npx playwright test tests/e2e/e2e/admin-tracking.spec.ts --reporter=list 2>&1 | grep -E "passed|failed|^\s+[0-9]+" | tail -5
echo ""

# Chatbot
echo "6. MODULE CHATBOT"
npx playwright test tests/e2e/e2e/admin-chatbot.spec.ts --reporter=list 2>&1 | grep -E "passed|failed|^\s+[0-9]+" | tail -5
echo ""

# Idées
echo "7. MODULE IDÉES"
npx playwright test tests/e2e/e2e/ideas-voting.spec.ts --reporter=list 2>&1 | grep -E "passed|failed|^\s+[0-9]+" | tail -5
echo ""

# CRM Membres
echo "8. MODULE CRM MEMBRES"
npx playwright test tests/e2e/e2e/crm-members-tags.spec.ts --reporter=list 2>&1 | grep -E "passed|failed|^\s+[0-9]+" | tail -5

