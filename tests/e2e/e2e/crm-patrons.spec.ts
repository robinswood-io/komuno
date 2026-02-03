import { test, expect } from '@playwright/test';
import { loginAsAdminQuick } from '../helpers/auth';

/**
 * Tests E2E - US-PATRONS-001: Gestion CRM des mécènes
 *
 * User Story:
 * En tant qu'admin, je veux gérer mécènes avec suivi dons/sponsorings pour maintenir relations financement.
 *
 * Endpoints testés (10):
 * - GET /api/patrons (admin, pagination/filtres)
 * - POST /api/patrons (création mécène)
 * - PATCH /api/patrons/:id (mise à jour)
 * - POST /api/patrons/:id/donations (enregistrer don)
 * - GET /api/patrons/:id/donations (historique dons)
 * - POST /api/patrons/:id/sponsorships (sponsoring événement)
 * - GET /api/patrons/:id/sponsorships (voir sponsorings)
 * - POST /api/patrons/:id/updates (interaction/meeting/call/email)
 * - GET /api/patrons/:id/updates (historique interactions)
 * - GET /api/patrons/:id/proposals (propositions idées-mécène)
 *
 * URL de test: https://cjd80.rbw.ovh
 * Auth: admin@test.local / devmode
 *
 * Tests: 15+ tests couvrant tous les critères d'acceptation
 *
 * AUTHENTICATION FIX:
 * - Uses page.request instead of request fixture
 * - page.request shares auth context with page (cookies/session)
 * - request fixture is separate and lacks authentication
 */

const BASE_URL = 'https://cjd80.rbw.ovh';
const API_BASE = `${BASE_URL}/api`;

interface PatronData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  role?: string;
  notes?: string;
  status?: string;
}

interface PatronResponse {
  success: boolean;
  data: PatronData;
}

interface PaginatedPatronResponse {
  data: PatronData[];
  total: number;
  page: number;
  limit: number;
}

interface DonationResponse {
  id: string;
  amountInCents: number;
  occasion?: string;
  donatedAt?: string;
}

interface SponsorshipResponse {
  id: string;
  eventId: string;
  amountInCents: number;
  type: string;
  notes?: string;
}

interface PatronUpdateResponse {
  id: string;
  type: string;
  notes?: string;
  createdAt?: string;
}

// Données de test pour patron
const TEST_PATRON = {
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean.dupont@example.com',
  company: 'Entreprise Test',
  phone: '+33612345678',
  role: 'CEO',
  notes: 'Mécène important'
};

const TEST_PATRON_UPDATED = {
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean.dupont.updated@example.com',
  company: 'Nouvelle Entreprise',
  phone: '+33687654321',
  role: 'Directeur Général',
  notes: 'Mécène très important'
};

const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}@example.com`;

test.describe('US-PATRONS-001: Gestion CRM des mécènes', () => {

  // Se connecter avant chaque test pour obtenir une session authentifiée
  test.beforeEach(async ({ page }) => {
    await loginAsAdminQuick(page, BASE_URL);
  });

  // ===== TEST 1: Voir liste mécènes =====
  test('1. Voir liste mécènes avec pagination', async ({ page }) => {
    // Vérifier que l'API retourne une liste valide
    const response = await page.request.get(`${API_BASE}/patrons?page=1&limit=20`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json() as PaginatedPatronResponse;
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('total');
    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  // ===== TEST 2: Créer mécène =====
  test('2. Créer mécène avec validations', async ({ page }) => {
    const email = uniqueEmail('patron-create');
    // Créer un mécène via l'API
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: { ...TEST_PATRON, email }
    });

    expect(createResponse.ok()).toBeTruthy();
    expect(createResponse.status()).toBe(201);

    const response = await createResponse.json() as PatronResponse;
    expect(response).toHaveProperty('success');
    expect(response.success).toBe(true);
    expect(response).toHaveProperty('data');

    const createdPatron = response.data;
    expect(createdPatron).toHaveProperty('id');
    expect(createdPatron.firstName).toBe(TEST_PATRON.firstName);
    expect(createdPatron.lastName).toBe(TEST_PATRON.lastName);
    expect(createdPatron.email).toBe(email);
    expect(createdPatron.company).toBe(TEST_PATRON.company);
    expect(createdPatron.phone).toBe(TEST_PATRON.phone);
    expect(createdPatron.role).toBe(TEST_PATRON.role);

    // Sauvegarder l'ID pour les tests suivants
    const patronId = createdPatron.id;

    // Vérifier que le mécène apparaît dans la liste
    const listResponse = await page.request.get(`${API_BASE}/patrons?search=${TEST_PATRON.firstName}`);

    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json() as PaginatedPatronResponse;
    const foundPatron = listData.data.find((patron) => patron.id === patronId);
    expect(foundPatron).toBeDefined();
  });

  // ===== TEST 3: Enregistrer don =====
  test('3. Enregistrer don pour mécène', async ({ page }) => {
    // Créer un mécène d'abord
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        ...TEST_PATRON,
        email: `donation-test-${Date.now()}@example.com`
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const response = await createResponse.json() as PatronResponse;
    const patronId = response.data.id;

    // Enregistrer un don
    const donationData = {
      amountInCents: 100000, // 1000 EUR
      donatedAt: new Date().toISOString(),
      occasion: 'Soirée de gala annuelle'
    };

    const donationResponse = await page.request.post(
      `${API_BASE}/patrons/${patronId}/donations`,
      {
          data: donationData
      }
    );

    expect(donationResponse.ok()).toBeTruthy();
    expect(donationResponse.status()).toBe(201);

    const donation = await donationResponse.json() as DonationResponse;
    expect(donation).toHaveProperty('id');
    expect(donation.amountInCents).toBe(donationData.amountInCents);
    expect(donation.occasion).toBe(donationData.occasion);

    // Vérifier que le don apparaît dans l'historique
    const historyResponse = await page.request.get(
      `${API_BASE}/patrons/${patronId}/donations`
    );

    expect(historyResponse.ok()).toBeTruthy();
    const donations = await historyResponse.json() as DonationResponse[];
    expect(Array.isArray(donations)).toBeTruthy();
    expect(donations.length).toBeGreaterThan(0);
    expect(donations.some((donationItem) => donationItem.amountInCents === donationData.amountInCents)).toBeTruthy();
  });

  // ===== TEST 4: Lier sponsoring à événement =====
  test('4. Créer sponsoring pour mécène', async ({ page }) => {
    // Créer un mécène d'abord
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        ...TEST_PATRON,
        email: `sponsorship-test-${Date.now()}@example.com`
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const response = await createResponse.json() as PatronResponse;
    const patronId = response.data.id;

    // Créer un sponsoring
    const sponsorshipData = {
      eventId: 'event-test-123',
      amountInCents: 200000, // 2000 EUR
      type: 'gold',
      notes: 'Sponsor principal de la soirée'
    };

    const sponsorshipResponse = await page.request.post(
      `${API_BASE}/patrons/${patronId}/sponsorships`,
      {
          data: sponsorshipData
      }
    );

    expect(sponsorshipResponse.ok()).toBeTruthy();
    expect(sponsorshipResponse.status()).toBe(201);

    const sponsorship = await sponsorshipResponse.json() as SponsorshipResponse;
    expect(sponsorship).toHaveProperty('id');
    expect(sponsorship.amountInCents).toBe(sponsorshipData.amountInCents);
    expect(sponsorship.type).toBe(sponsorshipData.type);
    expect(sponsorship.eventId).toBe(sponsorshipData.eventId);

    // Vérifier que le sponsoring apparaît dans la liste
    const listResponse = await page.request.get(
      `${API_BASE}/patrons/${patronId}/sponsorships`
    );

    expect(listResponse.ok()).toBeTruthy();
    const sponsorships = await listResponse.json() as SponsorshipResponse[];
    expect(Array.isArray(sponsorships)).toBeTruthy();
    expect(sponsorships.length).toBeGreaterThan(0);
    expect(sponsorships.some((item) => item.type === 'gold')).toBeTruthy();
  });

  // ===== TEST 5: Enregistrer interaction (meeting) =====
  test('5. Enregistrer interaction/meeting avec mécène', async ({ page }) => {
    // Créer un mécène d'abord
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        ...TEST_PATRON,
        email: `update-test-${Date.now()}@example.com`
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const response = await createResponse.json() as PatronResponse;
    const patronId = response.data.id;

    // Enregistrer une interaction (meeting)
    const updateData = {
      type: 'meeting',
      subject: 'Réunion de présentation du projet',
      date: '2026-01-20',
      startTime: '14:00',
      duration: 60,
      description: 'Présentation du projet annuel et discussion des opportunités de sponsoring',
      notes: 'Très intéressé par le projet'
    };

    const updateResponse = await page.request.post(
      `${API_BASE}/patrons/${patronId}/updates`,
      {
          data: updateData
      }
    );

    expect(updateResponse.ok()).toBeTruthy();
    expect(updateResponse.status()).toBe(201);

    const update = await updateResponse.json() as PatronUpdateResponse;
    expect(update).toHaveProperty('id');
    expect(update.type).toBe('meeting');
    expect(update.subject).toBe(updateData.subject);
    expect(update.description).toBe(updateData.description);
    expect(update.notes).toBe(updateData.notes);

    // Vérifier que l'interaction apparaît dans l'historique
    const historyResponse = await page.request.get(
      `${API_BASE}/patrons/${patronId}/updates`
    );

    expect(historyResponse.ok()).toBeTruthy();
    const updates = await historyResponse.json() as PatronUpdateResponse[];
    expect(Array.isArray(updates)).toBeTruthy();
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.some((item) => item.type === 'meeting')).toBeTruthy();
  });

  // ===== TEST 6: Voir historique dons =====
  test('6. Voir historique dons avec montants', async ({ page }) => {
    // Créer un mécène d'abord
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        ...TEST_PATRON,
        email: `history-test-${Date.now()}@example.com`
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const response = await createResponse.json() as PatronResponse;
    const patronId = response.data.id;

    // Enregistrer plusieurs dons
    const donations = [
      { amountInCents: 100000, donatedAt: new Date('2025-01-15').toISOString(), occasion: 'Don 2025' },
      { amountInCents: 50000, donatedAt: new Date('2025-06-20').toISOString(), occasion: 'Soirée de gala' },
      { amountInCents: 75000, donatedAt: new Date('2025-12-01').toISOString(), occasion: 'Événement annuel' }
    ];

    for (const donation of donations) {
      const response = await page.request.post(
        `${API_BASE}/patrons/${patronId}/donations`,
        {
              data: donation
        }
      );
      expect(response.ok()).toBeTruthy();
    }

    // Récupérer l'historique complet
    const historyResponse = await page.request.get(
      `${API_BASE}/patrons/${patronId}/donations`
    );

    expect(historyResponse.ok()).toBeTruthy();
    const allDonations = await historyResponse.json() as DonationResponse[];

    // Vérifier que tous les dons sont présents
    expect(Array.isArray(allDonations)).toBeTruthy();
    expect(allDonations.length).toBe(donations.length);

    // Vérifier les montants
    const amounts = allDonations.map((donation) => donation.amountInCents).sort((a, b) => a - b);
    expect(amounts).toEqual([50000, 75000, 100000]);

    // Vérifier le montant total
    const totalAmount = allDonations.reduce((sum, donation) => sum + donation.amountInCents, 0);
    expect(totalAmount).toBe(225000); // 2250 EUR total
  });

  // ===== TEST 7: Mettre à jour mécène =====
  test('7. Mettre à jour informations mécène', async ({ page }) => {
    // Créer un mécène d'abord
    const createEmail = uniqueEmail('patron-update');
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: { ...TEST_PATRON, email: createEmail }
    });

    expect(createResponse.ok()).toBeTruthy();
    const response = await createResponse.json() as PatronResponse;
    const patronId = response.data.id;

    // Mettre à jour le mécène
    const updatedEmail = uniqueEmail('patron-updated');
    const updateResponse = await page.request.patch(
      `${API_BASE}/patrons/${patronId}`,
      {
          data: { ...TEST_PATRON_UPDATED, email: updatedEmail }
      }
    );

    expect(updateResponse.ok()).toBeTruthy();
    expect(updateResponse.status()).toBe(200);

    const updatedPatron = await updateResponse.json();
    expect(updatedPatron.id).toBe(patronId);
    expect(updatedPatron.firstName).toBe(TEST_PATRON_UPDATED.firstName);
    expect(updatedPatron.email).toBe(updatedEmail);
    expect(updatedPatron.company).toBe(TEST_PATRON_UPDATED.company);
    expect(updatedPatron.phone).toBe(TEST_PATRON_UPDATED.phone);

    // Vérifier les modifications via l'API
    const getResponse = await page.request.get(
      `${API_BASE}/patrons/${patronId}`
    );

    expect(getResponse.ok()).toBeTruthy();
    const verifiedPatron = await getResponse.json();
    expect(verifiedPatron.email).toBe(updatedEmail);
    expect(verifiedPatron.company).toBe(TEST_PATRON_UPDATED.company);
  });

  // ===== TEST 8: Chercher mécène par email =====
  test('8. Rechercher mécène par email', async ({ page }) => {
    // Créer un mécène d'abord
    const testEmail = `search-test-${Date.now()}@example.com`;
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        ...TEST_PATRON,
        email: testEmail
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const patron = await createResponse.json() as PatronResponse;
    expect(patron.email).toBe(testEmail);

    // Chercher par email
    const searchResponse = await page.request.get(
      `${API_BASE}/patrons/search/email?email=${encodeURIComponent(testEmail)}`,
    );

    expect(searchResponse.ok()).toBeTruthy();
    const searchResult = await searchResponse.json();
    expect(searchResult).toHaveProperty('email', testEmail);
  });

  // ===== TEST 9: Filtrer par statut =====
  test('9. Filtrer mécènes par statut', async ({ page }) => {
    // Créer un mécène
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        ...TEST_PATRON,
        email: `status-test-${Date.now()}@example.com`
      }
    });

    expect(createResponse.ok()).toBeTruthy();

    // Récupérer les mécènes actifs
    const activeResponse = await page.request.get(
      `${API_BASE}/patrons?status=active&limit=50`,
    );

    expect(activeResponse.ok()).toBeTruthy();
    const activeData = await activeResponse.json() as PaginatedPatronResponse;
    expect(Array.isArray(activeData.data)).toBeTruthy();

    // Vérifier que tous les mécènes ont un statut cohérent
    activeData.data.forEach((patron) => {
      expect(patron).toHaveProperty('status');
      expect(['active', 'proposed']).toContain(patron.status);
    });
  });

  // ===== TEST 10: Pagination =====
  test('10. Tester pagination de la liste mécènes', async ({ page }) => {
    // Créer plusieurs mécènes
    const emailPrefix = `pagination-test-${Date.now()}`;
    for (let i = 1; i <= 3; i++) {
      const response = await page.request.post(`${API_BASE}/patrons`, {
          data: {
          firstName: `Patron${i}`,
          lastName: 'Test',
          email: `${emailPrefix}-${i}@example.com`
        }
      });
      expect(response.ok()).toBeTruthy();
    }

    // Tester page 1
    const page1Response = await page.request.get(
      `${API_BASE}/patrons?page=1&limit=2`,
    );

    expect(page1Response.ok()).toBeTruthy();
    const page1Data = await page1Response.json();
    expect(page1Data.page).toBe(1);
    expect(page1Data.limit).toBe(2);
    expect(page1Data.data.length).toBeLessThanOrEqual(2);

    // Tester page 2
    const page2Response = await page.request.get(
      `${API_BASE}/patrons?page=2&limit=2`,
    );

    expect(page2Response.ok()).toBeTruthy();
    const page2Data = await page2Response.json();
    expect(page2Data.page).toBe(2);
  });

  // ===== TEST 11: Supprimer mécène =====
  test('11. Supprimer mécène', async ({ page }) => {
    // Créer un mécène
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        ...TEST_PATRON,
        email: `delete-test-${Date.now()}@example.com`
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const patron = await createResponse.json();
    const patronId = patron.id;

    // Vérifier que le mécène existe
    const getResponse = await page.request.get(
      `${API_BASE}/patrons/${patronId}`
    );
    expect(getResponse.ok()).toBeTruthy();

    // Supprimer le mécène
    const deleteResponse = await page.request.delete(
      `${API_BASE}/patrons/${patronId}`
    );

    expect(deleteResponse.status()).toBe(204);

    // Vérifier que le mécène a été supprimé
    const verifyResponse = await page.request.get(
      `${API_BASE}/patrons/${patronId}`
    );
    expect(verifyResponse.status()).toBe(404);
  });

  // ===== TEST 12: Validation des données d'entrée =====
  test('12. Validation des données d\'entrée', async ({ page }) => {
    // Test: Email invalide
    const invalidEmailResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email'
      }
    });

    expect(invalidEmailResponse.status()).toBe(400);

    // Test: Prénom trop court
    const shortFirstNameResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        firstName: 'a',
        lastName: 'Test',
        email: 'test@example.com'
      }
    });

    expect(shortFirstNameResponse.status()).toBe(400);

    // Test: Nom trop court
    const shortLastNameResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        firstName: 'Test',
        lastName: 'a',
        email: 'test@example.com'
      }
    });

    expect(shortLastNameResponse.status()).toBe(400);
  });

  // ===== TEST 13: Tous les types d'interaction =====
  test('13. Enregistrer tous les types d\'interactions', async ({ page }) => {
    // Créer un mécène
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        ...TEST_PATRON,
        email: `interactions-test-${Date.now()}@example.com`
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const patron = await createResponse.json();
    const patronId = patron.id;

    // Types d'interactions à tester
    const interactionTypes = ['meeting', 'email', 'call', 'lunch', 'event'];

    for (const type of interactionTypes) {
      const response = await page.request.post(
        `${API_BASE}/patrons/${patronId}/updates`,
        {
              data: {
            type: type,
            subject: `Test interaction: ${type}`,
            date: '2026-01-20',
            description: `Test du type d'interaction ${type}`,
            startTime: '14:00',
            duration: 60
          }
        }
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(201);

      const interaction = await response.json();
      expect(interaction.type).toBe(type);
    }

    // Vérifier que toutes les interactions sont enregistrées
    const historyResponse = await page.request.get(
      `${API_BASE}/patrons/${patronId}/updates`
    );

    expect(historyResponse.ok()).toBeTruthy();
    const updates = await historyResponse.json() as PatronUpdateResponse[];

    // Vérifier que chaque type d'interaction est présent
    for (const type of interactionTypes) {
      const found = updates.some((updateItem) => updateItem.type === type);
      expect(found).toBeTruthy();
    }
  });

  // ===== TEST 14: Recherche par nom partiel =====
  test('14. Rechercher mécènes par nom partiel', async ({ page }) => {
    const uniqueFirstName = `UniqueTestName${Date.now()}`;

    // Créer un mécène avec un nom unique
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        firstName: uniqueFirstName,
        lastName: 'TestLastName',
        email: `unique-search-${Date.now()}@example.com`
      }
    });

    expect(createResponse.ok()).toBeTruthy();

    // Chercher par prénom partiel
    const searchResponse = await page.request.get(
      `${API_BASE}/patrons?search=${uniqueFirstName.substring(0, 5)}`,
    );

    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json() as PaginatedPatronResponse;
    expect(Array.isArray(searchData.data)).toBeTruthy();

    // Le mécène créé devrait être trouvé
    const found = searchData.data.some((patronItem) => patronItem.firstName === uniqueFirstName);
    expect(found).toBeTruthy();
  });

  // ===== TEST 15: Propositions idées-mécène =====
  test('15. Récupérer propositions idées pour mécène', async ({ page }) => {
    // Créer un mécène
    const createResponse = await page.request.post(`${API_BASE}/patrons`, {
      data: {
        ...TEST_PATRON,
        email: `proposals-test-${Date.now()}@example.com`
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const response = await createResponse.json() as PatronResponse;
    const patronId = response.data.id;

    // Récupérer les propositions
    const proposalsResponse = await page.request.get(
      `${API_BASE}/patrons/${patronId}/proposals`,
    );

    expect(proposalsResponse.ok()).toBeTruthy();
    const proposals = await proposalsResponse.json();
    expect(Array.isArray(proposals)).toBeTruthy();
  });

});
