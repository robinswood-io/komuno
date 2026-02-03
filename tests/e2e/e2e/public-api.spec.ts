import { test, expect } from '../fixtures';
import { 
  generateTestEvent, 
  generateTestInscription,
  generateTestEmail
} from '../helpers/test-data';
import { storage } from '../../../server/storage';

/**
 * Tests des routes API publiques (sans authentification)
 * 
 * Ces tests vérifient que :
 * 1. Les routes health check fonctionnent correctement
 * 2. Les routes de lecture retournent des données paginées
 * 3. Les routes d'inscription/désinscription fonctionnent
 * 
 * Tous les tests utilisent le nettoyage automatique via fixtures
 */

test.describe('Public API - Health Checks', () => {
  test('GET /api/health - should return healthy status with database info', async ({ page }) => {
    console.log('[TEST] Testing GET /api/health endpoint');
    
    const response = await page.request.get('/api/health');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log('[TEST] Health check response:', JSON.stringify(data, null, 2));
    
    // Vérifier la structure
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('database');
    
    // Vérifier les valeurs
    expect(data.status).toBe('healthy');
    expect(data.database).toHaveProperty('connected');
    expect(data.database.connected).toBe(true);
    
    // Vérifier le timestamp est valide
    const timestamp = new Date(data.timestamp);
    expect(timestamp.toString()).not.toBe('Invalid Date');
    
    console.log('[TEST] ✅ Health check passed');
  });

  test('GET /api/health/db - should return database health with pool stats', async ({ page }) => {
    console.log('[TEST] Testing GET /api/health/db endpoint');
    
    const response = await page.request.get('/api/health/db');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log('[TEST] DB health response:', JSON.stringify(data, null, 2));
    
    // Vérifier la structure
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('database');
    
    // Vérifier les infos database
    expect(data.database).toHaveProperty('connected', true);
    expect(data.database).toHaveProperty('responseTime');
    expect(data.database).toHaveProperty('pool');
    
    // Vérifier les pool stats
    expect(data.database.pool).toHaveProperty('totalCount');
    expect(data.database.pool).toHaveProperty('idleCount');
    expect(data.database.pool).toHaveProperty('waitingCount');
    
    console.log('[TEST] ✅ DB health check passed');
  });

  test('GET /api/health/ready - should return ready status', async ({ page }) => {
    console.log('[TEST] Testing GET /api/health/ready endpoint');
    
    const response = await page.request.get('/api/health/ready');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log('[TEST] Readiness check response:', JSON.stringify(data, null, 2));
    
    // Vérifier la structure
    expect(data).toHaveProperty('status', 'ready');
    expect(data).toHaveProperty('timestamp');
    
    // Vérifier le timestamp est valide
    const timestamp = new Date(data.timestamp);
    expect(timestamp.toString()).not.toBe('Invalid Date');
    
    console.log('[TEST] ✅ Readiness check passed');
  });

  test('GET /api/health/live - should return alive status', async ({ page }) => {
    console.log('[TEST] Testing GET /api/health/live endpoint');
    
    const response = await page.request.get('/api/health/live');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log('[TEST] Liveness check response:', JSON.stringify(data, null, 2));
    
    // Vérifier la structure
    expect(data).toHaveProperty('status', 'alive');
    expect(data).toHaveProperty('timestamp');
    
    // Vérifier le timestamp est valide
    const timestamp = new Date(data.timestamp);
    expect(timestamp.toString()).not.toBe('Invalid Date');
    
    console.log('[TEST] ✅ Liveness check passed');
  });
});

test.describe('Public API - Data Reading', () => {
  test('GET /api/ideas - should return paginated ideas', async ({ page }) => {
    console.log('[TEST] Testing GET /api/ideas endpoint');
    
    const response = await page.request.get('/api/ideas?page=1&limit=10');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log('[TEST] Ideas response structure:', {
      hasSuccess: 'success' in data,
      hasData: 'data' in data,
      dataKeys: data.data ? Object.keys(data.data) : []
    });
    
    // Vérifier la structure de pagination
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    
    // Vérifier la structure des données paginées
    expect(data.data).toHaveProperty('data');
    expect(data.data).toHaveProperty('total');
    expect(data.data).toHaveProperty('page');
    expect(data.data).toHaveProperty('limit');
    
    // Vérifier les types
    expect(Array.isArray(data.data.data)).toBe(true);
    expect(typeof data.data.total).toBe('number');
    expect(typeof data.data.page).toBe('number');
    expect(typeof data.data.limit).toBe('number');
    
    console.log(`[TEST] ✅ Ideas pagination passed - ${data.data.total} ideas found`);
  });

  test('GET /api/events - should return paginated events', async ({ page }) => {
    console.log('[TEST] Testing GET /api/events endpoint');
    
    const response = await page.request.get('/api/events?page=1&limit=10');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log('[TEST] Events response structure:', {
      hasSuccess: 'success' in data,
      hasData: 'data' in data,
      dataKeys: data.data ? Object.keys(data.data) : []
    });
    
    // Vérifier la structure de pagination
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    
    // Vérifier la structure des données paginées
    expect(data.data).toHaveProperty('data');
    expect(data.data).toHaveProperty('total');
    expect(data.data).toHaveProperty('page');
    expect(data.data).toHaveProperty('limit');
    
    // Vérifier les types
    expect(Array.isArray(data.data.data)).toBe(true);
    expect(typeof data.data.total).toBe('number');
    expect(typeof data.data.page).toBe('number');
    expect(typeof data.data.limit).toBe('number');
    
    console.log(`[TEST] ✅ Events pagination passed - ${data.data.total} events found`);
  });
});

test.describe('Public API - Inscriptions & Unsubscriptions', () => {
  let testEventId: string;

  test.beforeEach(async ({ page }) => {
    console.log('[TEST] Creating test event for inscription tests');
    
    // Créer un événement de test via storage pour éviter le rate limiting
    // Ajout d'un ID unique pour éviter les collisions entre tests parallèles
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const eventData = generateTestEvent({
      title: `[TEST] Événement inscriptions ${uniqueId}`,
      daysFromNow: 30
    });
    
    const result = await storage.createEvent({
      title: eventData.title,
      description: eventData.description,
      date: eventData.date,
      location: eventData.location,
    });
    
    if (result.success) {
      testEventId = result.data.id;
      console.log(`[TEST] ✅ Test event created with ID: ${testEventId}`);
      
      // Vérifier que l'événement est bien accessible via l'API
      let retries = 3;
      let eventFound = false;
      
      while (retries > 0 && !eventFound) {
        const checkResult = await storage.getEvent(testEventId);
        if (checkResult.success && checkResult.data) {
          eventFound = true;
          console.log(`[TEST] ✅ Event verified and accessible`);
        } else {
          console.log(`[TEST] ⏳ Waiting for event to be accessible... (${retries} retries left)`);
          await page.waitForTimeout(500);
          retries--;
        }
      }
      
      if (!eventFound) {
        throw new Error('Event created but not accessible after verification');
      }
    } else {
      throw new Error(`Failed to create test event: ${result.error.message}`);
    }
  });

  test('POST /api/inscriptions - should create valid inscription', async ({ page }) => {
    console.log(`[TEST] Testing POST /api/inscriptions for event ${testEventId}`);
    
    const inscriptionData = generateTestInscription({
      name: '[TEST] Participant Valid'
    });
    
    console.log('[TEST] Creating inscription:', inscriptionData);
    
    const response = await page.request.post('/api/inscriptions', {
      data: {
        eventId: testEventId,
        name: inscriptionData.name,
        email: inscriptionData.email,
        company: inscriptionData.company,
        phone: inscriptionData.phone,
      }
    });
    
    const responseData = await response.json();
    console.log('[TEST] Inscription response:', responseData);
    
    expect(response.status()).toBe(201);
    expect(responseData).toHaveProperty('id');
    expect(responseData.eventId).toBe(testEventId);
    expect(responseData.name).toBe(inscriptionData.name);
    expect(responseData.email).toBe(inscriptionData.email);
    
    console.log('[TEST] ✅ Valid inscription created successfully');
  });

  test('POST /api/inscriptions - should reject duplicate email', async ({ page }) => {
    console.log(`[TEST] Testing duplicate inscription for event ${testEventId}`);
    
    // Créer une première inscription
    const inscriptionData = generateTestInscription({
      name: '[TEST] Participant Duplicate'
    });
    
    console.log('[TEST] Creating first inscription:', inscriptionData.email);
    
    const firstResponse = await page.request.post('/api/inscriptions', {
      data: {
        eventId: testEventId,
        name: inscriptionData.name,
        email: inscriptionData.email,
        company: inscriptionData.company,
      }
    });
    
    expect(firstResponse.status()).toBe(201);
    console.log('[TEST] ✅ First inscription created');
    
    // Tenter de créer une deuxième inscription avec le même email
    console.log('[TEST] Attempting duplicate inscription with same email');
    
    const duplicateResponse = await page.request.post('/api/inscriptions', {
      data: {
        eventId: testEventId,
        name: inscriptionData.name,
        email: inscriptionData.email, // Même email
        company: inscriptionData.company,
      }
    });
    
    const duplicateData = await duplicateResponse.json();
    console.log('[TEST] Duplicate response:', duplicateData);
    
    // Devrait retourner une erreur 400
    expect(duplicateResponse.status()).toBe(400);
    expect(duplicateData).toHaveProperty('message');
    
    console.log('[TEST] ✅ Duplicate inscription correctly rejected');
  });

  test('POST /api/unsubscriptions - should unsubscribe successfully', async ({ page }) => {
    console.log(`[TEST] Testing POST /api/unsubscriptions for event ${testEventId}`);
    
    // D'abord créer une inscription
    const inscriptionData = generateTestInscription({
      name: '[TEST] Participant Unsubscribe'
    });
    
    console.log('[TEST] Creating inscription before unsubscribe:', inscriptionData.email);
    
    const inscriptionResponse = await page.request.post('/api/inscriptions', {
      data: {
        eventId: testEventId,
        name: inscriptionData.name,
        email: inscriptionData.email,
        company: inscriptionData.company,
      }
    });
    
    expect(inscriptionResponse.status()).toBe(201);
    console.log('[TEST] ✅ Inscription created');
    
    // Maintenant se désinscrire
    console.log('[TEST] Unsubscribing:', inscriptionData.email);
    
    const unsubscribeResponse = await page.request.post('/api/unsubscriptions', {
      data: {
        eventId: testEventId,
        name: inscriptionData.name,
        email: inscriptionData.email,
        reason: 'Test de désinscription automatique'
      }
    });
    
    const unsubscribeData = await unsubscribeResponse.json();
    console.log('[TEST] Unsubscription response:', unsubscribeData);
    
    expect(unsubscribeResponse.status()).toBe(201);
    expect(unsubscribeData).toHaveProperty('id');
    expect(unsubscribeData.eventId).toBe(testEventId);
    expect(unsubscribeData.email).toBe(inscriptionData.email);
    
    console.log('[TEST] ✅ Unsubscription successful');
  });

  test('POST /api/unsubscriptions - should allow unsubscribe without prior inscription', async ({ page }) => {
    console.log(`[TEST] Testing unsubscription without prior inscription for event ${testEventId}`);
    
    // Tenter de se désinscrire sans avoir été inscrit
    const email = generateTestEmail('unsubscribe-direct');
    
    console.log('[TEST] Unsubscribing without prior inscription:', email);
    
    const response = await page.request.post('/api/unsubscriptions', {
      data: {
        eventId: testEventId,
        name: '[TEST] Direct Unsubscribe',
        email: email,
        reason: 'Test désinscription directe'
      }
    });
    
    const responseData = await response.json();
    console.log('[TEST] Direct unsubscription response:', responseData);
    
    // Devrait créer la désinscription même sans inscription préalable
    expect(response.status()).toBe(201);
    expect(responseData).toHaveProperty('id');
    expect(responseData.email).toBe(email);
    
    console.log('[TEST] ✅ Direct unsubscription allowed');
  });
});

test.describe('Public API - Edge Cases', () => {
  test('GET /api/ideas - should handle pagination parameters', async ({ page }) => {
    console.log('[TEST] Testing ideas pagination with different parameters');
    
    // Test page 1 with limit 5
    const response1 = await page.request.get('/api/ideas?page=1&limit=5');
    const data1 = await response1.json();
    
    expect(data1.data.page).toBe(1);
    expect(data1.data.limit).toBe(5);
    expect(data1.data.data.length).toBeLessThanOrEqual(5);
    
    console.log('[TEST] ✅ Pagination page 1, limit 5 works correctly');
    
    // Test page 2 (si assez de données)
    if (data1.data.total > 5) {
      const response2 = await page.request.get('/api/ideas?page=2&limit=5');
      const data2 = await response2.json();
      
      expect(data2.data.page).toBe(2);
      expect(data2.data.limit).toBe(5);
      
      console.log('[TEST] ✅ Pagination page 2 works correctly');
    } else {
      console.log('[TEST] ⏭️  Skipping page 2 test (not enough data)');
    }
  });

  test('GET /api/events - should handle pagination parameters', async ({ page }) => {
    console.log('[TEST] Testing events pagination with different parameters');
    
    // Test page 1 with limit 3
    const response1 = await page.request.get('/api/events?page=1&limit=3');
    const data1 = await response1.json();
    
    expect(data1.data.page).toBe(1);
    expect(data1.data.limit).toBe(3);
    expect(data1.data.data.length).toBeLessThanOrEqual(3);
    
    console.log('[TEST] ✅ Pagination page 1, limit 3 works correctly');
  });
});
