import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import passport from 'passport';

/**
 * Test d'intégration pour le changement de statut des idées
 * Ce test vérifie que:
 * 1. Les requêtes non-authentifiées sont rejetées (401)
 * 2. Les requêtes authentifiées peuvent changer le statut
 * 3. Les cookies de session sont correctement gérés avec sameSite
 */

describe('Idea Status API Integration', () => {
  let app: express.Application;
  let agent: request.SuperAgentTest;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Configuration session identique à la prod
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      },
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user: unknown, done) => done(null, user.id));
    passport.deserializeUser((id: string, done) => {
      done(null, { id, email: 'admin@test.com', role: 'SUPER_ADMIN' });
    });

    app.post('/api/auth/login', (req, res) => {
      const user = { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN' };
      req.login(user, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(user);
      });
    });

    app.patch('/api/admin/ideas/:id/status', (req, res) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { status } = req.body;
      const validStatuses = ['pending', 'approved', 'rejected', 'under_review', 'postponed', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      res.json({ success: true, id: req.params.id, status });
    });

    agent = request.agent(app);
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const response = await request(app)
        .patch('/api/admin/ideas/123/status')
        .send({ status: 'approved' });
      
      expect(response.status).toBe(401);
    });

    it('should accept authenticated requests', async () => {
      await agent.post('/api/auth/login').send({ email: 'admin@test.com', password: 'test' });
      const response = await agent.patch('/api/admin/ideas/123/status').send({ status: 'approved' });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('approved');
    });
  });

  describe('Status Validation', () => {
    it('should reject invalid status', async () => {
      await agent.post('/api/auth/login').send({ email: 'admin@test.com', password: 'test' });
      const response = await agent.patch('/api/admin/ideas/123/status').send({ status: 'invalid' });
      expect(response.status).toBe(400);
    });

    ['pending', 'approved', 'rejected', 'under_review', 'postponed', 'completed'].forEach((status) => {
      it(`should accept '${status}' as valid`, async () => {
        const response = await agent.patch('/api/admin/ideas/123/status').send({ status });
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Session Cookie', () => {
    it('should set cookie with SameSite=Lax', async () => {
      const response = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'test' });
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const sessionCookie = cookies?.find((c: string) => c.includes('connect.sid'));
      expect(sessionCookie).toContain('SameSite=Lax');
    });
  });
});
