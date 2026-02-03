import { test, expect, Page } from '@playwright/test';

// Helper functions
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('input[name="email"]', { timeout: 5000 });
  await page.fill('input[name="email"]', 'admin@test.local');
  await page.fill('input[name="password"]', 'devmode');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin|\/dashboard/, { timeout: 15000 });
}

async function loginAsUser(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('input[name="email"]', { timeout: 5000 });
  await page.fill('input[name="email"]', 'manager@test.local');
  await page.fill('input[name="password"]', 'devmode');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin|\/dashboard/, { timeout: 15000 });
}

async function logout(page: Page) {
  // Chercher et cliquer sur le bouton de déconnexion
  const logoutButton = page.locator('button:has-text("Déconnexion"), button:has-text("Logout"), [data-testid="logout-button"]').first();
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL('/', { timeout: 5000 });
  }
}

test.describe('PARCOURS 1: Admin - Gestion Complète Idées', () => {
  // État partagé pour maintenir la session
  let adminPage: Page;

  test.beforeAll(async ({ browser }) => {
    adminPage = await browser.newPage();
    await loginAsAdmin(adminPage);
  });

  test.afterAll(async () => {
    await adminPage.close();
  });

  test('1.1 Login admin et accès dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/dashboard|admin/);
  });

  test('1.2 Voir statistiques idées sur dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    // Le dashboard admin redirige vers /admin, pas /dashboard
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1, h2').filter({ hasText: /Admin|Dashboard/i })).toBeVisible();
  });

  test('1.3 Accéder à la gestion des idées', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/ideas');
    await expect(page).toHaveURL('/admin/ideas');
    await expect(page.locator('h1, h2').filter({ hasText: /Idées|Ideas/i })).toBeVisible();
  });

  test('1.4 Créer nouvelle idée (admin peut proposer)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/ideas');

    // Cliquer sur bouton créer
    await page.click('button:has-text("Nouvelle idée")');
    await page.waitForTimeout(500); // Attendre que le modal s'ouvre

    // Remplir formulaire
    await page.fill('input[name="title"]', 'Idée Test Admin ' + Date.now());
    await page.fill('textarea[name="description"]', 'Description de test pour l\'idée admin');
    await page.fill('input[name="proposedBy"]', 'Admin Test');
    await page.fill('input[name="proposedByEmail"]', 'admin@test.local');

    // Soumettre - le bouton dit "Créer l'idée"
    await page.click('button:has-text("Créer l\'idée")');
    await page.waitForTimeout(1000);

    // Vérifier création (utiliser first() car notification peut avoir plusieurs éléments)
    await expect(page.locator('text=/Idée.*créée|créée avec succès/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('1.5 Approuver une idée pending', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/ideas');

    // Chercher idée avec statut pending
    const pendingIdea = page.locator('[data-status="pending"], .status-pending').first();
    if (await pendingIdea.count() > 0) {
      await pendingIdea.click();
      await page.click('button:has-text("Approuver"), button:has-text("Valider")');
      await expect(page.locator('text=/approuvée|validée/i')).toBeVisible();
    }
  });

  test('1.6 Rejeter une idée', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/ideas');

    const idea = page.locator('.idea-item, [data-testid="idea-card"]').first();
    if (await idea.count() > 0) {
      await idea.click();
      await page.click('button:has-text("Rejeter"), button:has-text("Refuser")');

      // Confirmer si modal
      const confirmButton = page.locator('button:has-text("Confirmer")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      await expect(page.locator('text=/rejetée|refusée/i')).toBeVisible();
    }
  });

  test('1.7 Archiver une idée', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/ideas');

    const idea = page.locator('.idea-item, [data-testid="idea-card"]').first();
    if (await idea.count() > 0) {
      await idea.click();
      await page.click('button:has-text("Archiver")');
      await expect(page.locator('text=/archivée/i')).toBeVisible();
    }
  });

  test('1.8 Featured une idée', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/ideas');

    const idea = page.locator('.idea-item, [data-testid="idea-card"]').first();
    if (await idea.count() > 0) {
      await idea.click();
      await page.click('button:has-text("Featured"), button[aria-label*="featured"]');
      await expect(page.locator('text=/mise en avant|featured/i')).toBeVisible();
    }
  });

  test('1.9 Supprimer une idée', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/ideas');

    const idea = page.locator('.idea-item, [data-testid="idea-card"]').first();
    if (await idea.count() > 0) {
      await idea.click();
      await page.click('button:has-text("Supprimer"), button[aria-label*="supprimer"]');

      // Confirmer
      const confirmButton = page.locator('button:has-text("Confirmer")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      await expect(page.locator('text=/supprimée|deleted/i')).toBeVisible();
    }
  });
});

test.describe('PARCOURS 2: Admin - Événements Complet', () => {
  test('2.1 Accéder aux événements', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');
    await expect(page).toHaveURL('/admin/events');
  });

  test('2.2 Créer événement complet', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');

    await page.click('button:has-text("Nouvel événement"), button:has-text("Créer")');
    await page.waitForTimeout(500); // Attendre que le modal s'ouvre

    await page.fill('input[name="title"]', 'Événement Test ' + Date.now());
    await page.fill('textarea[name="description"]', 'Description complète de l\'événement de test');
    await page.fill('input[name="location"]', 'Amiens, France');

    // Date datetime-local nécessite format complet: YYYY-MM-DDTHH:MM
    const dateInput = page.locator('input[type="datetime-local"], input[name="date"]');
    if (await dateInput.count() > 0) {
      await dateInput.fill('2026-03-15T14:00');
    }

    // Cliquer sur le bouton de soumission dans le modal
    await page.click('button:has-text("Créer"):not(:has-text("Créer un événement"))');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/événement.*créé/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('2.3 Publier événement (draft → published)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');

    const draftEvent = page.locator('[data-status="draft"]').first();
    if (await draftEvent.count() > 0) {
      await draftEvent.click();
      await page.click('button:has-text("Publier")');
      await expect(page.locator('text=/publié|published/i')).toBeVisible();
    }
  });

  test('2.4 Voir liste participants', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');

    const event = page.locator('.event-item, [data-testid="event-card"]').first();
    if (await event.count() > 0) {
      await event.click();
      await expect(page.locator('text=/Participants|Inscrits/i')).toBeVisible();
    }
  });

  test('2.5 Ajouter participant manuellement', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');

    const event = page.locator('.event-item, [data-testid="event-card"]').first();
    if (await event.count() > 0) {
      await event.click();

      const addParticipantBtn = page.locator('button:has-text("Ajouter participant")');
      if (await addParticipantBtn.count() > 0) {
        await addParticipantBtn.click();
        // Sélectionner utilisateur
        await page.click('.user-select option, [role="option"]');
        await page.click('button:has-text("Ajouter")');
        await expect(page.locator('text=/ajouté|inscrit/i')).toBeVisible();
      }
    }
  });

  test('2.6 Modifier événement', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');

    const event = page.locator('.event-item, [data-testid="event-card"]').first();
    if (await event.count() > 0) {
      await event.click();
      await page.click('button:has-text("Modifier"), button[aria-label*="modifier"]');

      await page.fill('input[name="title"]', 'Événement Modifié ' + Date.now());
      await page.click('button[type="submit"]');
      await expect(page.locator('text=/modifié|mis à jour/i')).toBeVisible();
    }
  });

  test('2.7 Annuler événement', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');

    const event = page.locator('.event-item, [data-testid="event-card"]').first();
    if (await event.count() > 0) {
      await event.click();
      await page.click('button:has-text("Annuler")');

      const confirmButton = page.locator('button:has-text("Confirmer")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      await expect(page.locator('text=/annulé|cancelled/i')).toBeVisible();
    }
  });
});

test.describe('PARCOURS 3: Admin - CRM Membres Exhaustif', () => {
  test('3.1 Accéder au CRM membres', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');
    await expect(page).toHaveURL('/admin/members');
  });

  test('3.2 Ajouter nouveau membre', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');

    await page.click('button:has-text("Nouveau membre"), button:has-text("Ajouter")');

    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User' + Date.now());
    await page.fill('input[name="email"]', `test${Date.now()}@test.local`);

    await page.click('button[type="submit"]');
    await expect(page.locator('text=/membre.*ajouté|créé avec succès/i')).toBeVisible();
  });

  test('3.3 Modifier membre existant', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');

    const member = page.locator('.member-item, [data-testid="member-card"]').first();
    if (await member.count() > 0) {
      await member.click();
      await page.click('button:has-text("Modifier")');

      await page.fill('input[name="firstName"]', 'Modified');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=/modifié|mis à jour/i')).toBeVisible();
    }
  });

  test('3.4 Ajouter tag au membre', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');

    const member = page.locator('.member-item, [data-testid="member-card"]').first();
    if (await member.count() > 0) {
      await member.click();

      const addTagBtn = page.locator('button:has-text("Ajouter tag"), button:has-text("Tag")');
      if (await addTagBtn.count() > 0) {
        await addTagBtn.click();
        await page.fill('input[placeholder*="tag"]', 'Test Tag');
        await page.keyboard.press('Enter');
        await expect(page.locator('text=Test Tag')).toBeVisible();
      }
    }
  });

  test('3.5 Créer tâche pour membre', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');

    const member = page.locator('.member-item, [data-testid="member-card"]').first();
    if (await member.count() > 0) {
      await member.click();

      const addTaskBtn = page.locator('button:has-text("Nouvelle tâche"), button:has-text("Ajouter tâche")');
      if (await addTaskBtn.count() > 0) {
        await addTaskBtn.click();
        await page.fill('input[name="title"]', 'Tâche test');
        await page.click('button[type="submit"]');
        await expect(page.locator('text=/tâche.*créée/i')).toBeVisible();
      }
    }
  });

  test('3.6 Voir historique activités membre', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');

    const member = page.locator('.member-item, [data-testid="member-card"]').first();
    if (await member.count() > 0) {
      await member.click();
      await expect(page.locator('text=/Activités|Historique/i')).toBeVisible();
    }
  });
});

test.describe('PARCOURS 4: Admin - Prêts Complet', () => {
  test('4.1 Accéder aux prêts', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/loans');
    await expect(page).toHaveURL('/admin/loans');
  });

  test('4.2 Créer objet prêtable', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/loans');

    await page.click('button:has-text("Nouvel objet"), button:has-text("Ajouter")');

    await page.fill('input[name="name"]', 'Objet Test ' + Date.now());
    await page.fill('textarea[name="description"]', 'Description objet de test');

    await page.click('button[type="submit"]');
    await expect(page.locator('text=/objet.*créé|ajouté avec succès/i')).toBeVisible();
  });

  test('4.3 Marquer comme disponible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/loans');

    const item = page.locator('.loan-item, [data-testid="loan-card"]').first();
    if (await item.count() > 0) {
      await item.click();
      await page.click('button:has-text("Disponible")');
      await expect(page.locator('text=/disponible/i')).toBeVisible();
    }
  });

  test('4.4 Workflow emprunter', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/loans');

    const item = page.locator('.loan-item, [data-testid="loan-card"]').first();
    if (await item.count() > 0) {
      await item.click();
      await page.click('button:has-text("Emprunter"), button:has-text("Prêter")');

      // Assigner emprunteur si nécessaire
      const userSelect = page.locator('select[name="borrower"], [name="userId"]');
      if (await userSelect.count() > 0) {
        await userSelect.selectOption({ index: 1 });
      }

      await page.click('button[type="submit"]');
      await expect(page.locator('text=/emprunté|prêté/i')).toBeVisible();
    }
  });

  test('4.5 Marquer comme retourné', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/loans');

    const borrowedItem = page.locator('[data-status="borrowed"]').first();
    if (await borrowedItem.count() > 0) {
      await borrowedItem.click();
      await page.click('button:has-text("Retourner"), button:has-text("Retour")');
      await expect(page.locator('text=/retourné|rendu/i')).toBeVisible();
    }
  });

  test('4.6 Voir historique emprunts', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/loans');

    const item = page.locator('.loan-item, [data-testid="loan-card"]').first();
    if (await item.count() > 0) {
      await item.click();
      await expect(page.locator('text=/Historique|History/i')).toBeVisible();
    }
  });
});

test.describe('PARCOURS 5: Admin - Financier', () => {
  test('5.1 Accéder au financier', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/financial');
    await expect(page).toHaveURL('/admin/financial');
  });

  test('5.2 Créer budget', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/financial');

    const createBudgetBtn = page.locator('button:has-text("Nouveau budget")');
    if (await createBudgetBtn.count() > 0) {
      await createBudgetBtn.click();
      await page.fill('input[name="name"]', 'Budget Test ' + Date.now());
      await page.fill('input[name="amount"]', '1000');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=/budget.*créé/i')).toBeVisible();
    }
  });

  test('5.3 Ajouter dépense', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/financial');

    const addExpenseBtn = page.locator('button:has-text("Nouvelle dépense"), button:has-text("Ajouter dépense")');
    if (await addExpenseBtn.count() > 0) {
      await addExpenseBtn.click();
      await page.fill('input[name="description"]', 'Dépense test');
      await page.fill('input[name="amount"]', '50');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=/dépense.*ajoutée/i')).toBeVisible();
    }
  });

  test('5.4 Voir dashboard financier', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/financial');
    await expect(page.locator('text=/Total|Budget|Dépenses/i')).toBeVisible();
  });
});

test.describe('PARCOURS 6: Admin - Configuration', () => {
  test('6.1 Accéder au branding', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/branding');
    await expect(page).toHaveURL('/admin/branding');
  });

  test('6.2 Modifier couleur primaire', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/branding');

    const colorInput = page.locator('input[type="color"], input[name*="color"]');
    if (await colorInput.count() > 0) {
      await colorInput.fill('#FF5733');
      await page.click('button:has-text("Sauvegarder"), button[type="submit"]');
      await expect(page.locator('text=/sauvegardé|enregistré/i')).toBeVisible();
    }
  });

  test('6.3 Accéder aux permissions', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/permissions');
    await expect(page.locator('text=/Permissions|Rôles|Roles/i')).toBeVisible();
  });
});

test.describe('PARCOURS 7: Utilisateur Standard - Idées', () => {
  test('7.1 Page accueil anonyme - voir idées', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('7.2 Voir liste idées publiques', async ({ page }) => {
    await page.goto('/ideas');
    await expect(page.locator('text=/Idées|Ideas/i')).toBeVisible();
  });

  test('7.3 Proposer idée nécessite login', async ({ page }) => {
    await page.goto('/ideas');
    await page.click('button:has-text("Proposer une idée"), button:has-text("Nouvelle idée")');
    await expect(page).toHaveURL(/login/);
  });

  test('7.4 Login utilisateur standard', async ({ page }) => {
    await loginAsUser(page);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('7.5 Proposer idée connecté', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/ideas');

    await page.click('button:has-text("Proposer une idée"), button:has-text("Nouvelle idée")');
    await page.fill('input[name="title"]', 'Idée Utilisateur ' + Date.now());
    await page.fill('textarea[name="description"]', 'Description de l\'idée utilisateur');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/idée.*soumise|créée/i')).toBeVisible();
  });

  test('7.6 Voter sur idée', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/ideas');

    const voteButton = page.locator('button[aria-label*="vote"], button:has-text("👍")').first();
    if (await voteButton.count() > 0) {
      const voteCountBefore = await page.locator('.vote-count').first().textContent();
      await voteButton.click();
      await page.waitForTimeout(1000);
      // Vérifier que le compteur a changé
      await expect(page.locator('.vote-count').first()).not.toHaveText(voteCountBefore || '0');
    }
  });
});

test.describe('PARCOURS 8: Utilisateur - Événements', () => {
  test('8.1 Anonyme - liste événements', async ({ page }) => {
    await page.goto('/events');
    await expect(page.locator('text=/Événements|Events/i')).toBeVisible();
  });

  test('8.2 Voir détails événement', async ({ page }) => {
    await page.goto('/events');
    const event = page.locator('.event-item, [data-testid="event-card"]').first();
    if (await event.count() > 0) {
      await event.click();
      await expect(page.locator('text=/Description|Date|Lieu/i')).toBeVisible();
    }
  });

  test('8.3 S\'inscrire à événement nécessite login', async ({ page }) => {
    await page.goto('/events');
    const event = page.locator('.event-item, [data-testid="event-card"]').first();
    if (await event.count() > 0) {
      await event.click();
      await page.click('button:has-text("S\'inscrire"), button:has-text("Participer")');
      await expect(page).toHaveURL(/login/);
    }
  });

  test('8.4 Login et inscription événement', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/events');

    const event = page.locator('.event-item, [data-testid="event-card"]').first();
    if (await event.count() > 0) {
      await event.click();
      await page.click('button:has-text("S\'inscrire"), button:has-text("Participer")');
      await expect(page.locator('text=/inscrit|inscription confirmée/i')).toBeVisible();
    }
  });

  test('8.5 Voir liste participants', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/events');

    const event = page.locator('.event-item, [data-testid="event-card"]').first();
    if (await event.count() > 0) {
      await event.click();
      await expect(page.locator('text=/Participants|Inscrits/i')).toBeVisible();
    }
  });

  test('8.6 Se désinscrire', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/events');

    const event = page.locator('.event-item, [data-testid="event-card"]').first();
    if (await event.count() > 0) {
      await event.click();

      const unsubscribeBtn = page.locator('button:has-text("Se désinscrire"), button:has-text("Annuler")');
      if (await unsubscribeBtn.count() > 0) {
        await unsubscribeBtn.click();
        await expect(page.locator('text=/désinscrit|inscription annulée/i')).toBeVisible();
      }
    }
  });
});

test.describe('PARCOURS 9: Utilisateur - Emprunts', () => {
  test('9.1 Login et voir objets disponibles', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/loans');
    await expect(page.locator('text=/Prêts|Objets disponibles/i')).toBeVisible();
  });

  test('9.2 Demander emprunt objet', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/loans');

    const availableItem = page.locator('[data-status="available"]').first();
    if (await availableItem.count() > 0) {
      await availableItem.click();
      await page.click('button:has-text("Emprunter"), button:has-text("Demander")');
      await expect(page.locator('text=/demande.*envoyée|emprunté/i')).toBeVisible();
    }
  });

  test('9.3 Voir statut emprunté', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/loans');

    const borrowedItem = page.locator('[data-status="borrowed"]').first();
    if (await borrowedItem.count() > 0) {
      await borrowedItem.click();
      await expect(page.locator('text=/Emprunté|En cours/i')).toBeVisible();
    }
  });
});

test.describe('PARCOURS 10: Erreurs & Edge Cases', () => {
  test('10.1 Login avec mauvais credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'wrong@test.local');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/erreur|incorrect|invalid/i')).toBeVisible();
  });

  test('10.2 Accéder admin sans permission', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/admin/members');
    // Devrait être redirigé ou afficher 403
    await expect(page.locator('text=/403|Non autorisé|Forbidden/i')).toBeVisible();
  });

  test('10.3 Soumettre formulaire vide', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/ideas');

    await page.click('button:has-text("Nouvelle idée"), button:has-text("Créer")');
    await page.click('button[type="submit"]');

    // Devrait afficher erreurs validation
    await expect(page.locator('text=/requis|obligatoire|required/i')).toBeVisible();
  });

  test('10.4 Soumettre données invalides', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/members');

    await page.click('button:has-text("Nouveau membre")');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/email.*invalide|invalid email/i')).toBeVisible();
  });

  test('10.5 Accéder ressource inexistante', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-123456789');
    await expect(page.locator('h1:has-text("404")')).toBeVisible();
  });

  test('10.6 Navigation back browser', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/ideas');
    await page.goto('/admin/events');
    await page.goBack();
    await expect(page).toHaveURL('/admin/ideas');
  });

  test('10.7 Refresh page maintient session', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.reload();
    await expect(page).toHaveURL('/dashboard');
    // Toujours connecté
    await expect(page.locator('text=/Déconnexion|Logout/i')).toBeVisible();
  });

  test('10.8 Double-click bouton submit', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/ideas');

    await page.click('button:has-text("Nouvelle idée")');
    await page.fill('input[name="title"]', 'Test Double Click ' + Date.now());
    await page.fill('textarea[name="description"]', 'Test description');

    const submitButton = page.locator('button[type="submit"]');

    // Double-cliquer rapidement
    await submitButton.click();
    await submitButton.click();

    await page.waitForTimeout(3000);

    // Vérifier qu'une seule idée a été créée (pas de doublon)
    await page.goto('/admin/ideas');
    const ideas = await page.locator('text=Test Double Click').count();
    expect(ideas).toBeLessThanOrEqual(1);
  });
});
