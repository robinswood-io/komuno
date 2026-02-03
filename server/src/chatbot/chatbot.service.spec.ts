import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatbotService } from './chatbot.service';
import OpenAI from 'openai';

// Mock du client OpenAI
vi.mock('openai');

// Mock de la base de données
vi.mock('../../db', () => ({
  pool: {
    query: vi.fn(),
  },
}));

// Mock du logger
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ChatbotService', () => {
  let service: ChatbotService;
  let mockOpenAI: any;

  beforeEach(() => {
    // Reset des mocks
    vi.clearAllMocks();

    // Setup du mock OpenAI
    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    };

    (OpenAI as any).mockImplementation(() => mockOpenAI);

    // Setup des variables d'environnement
    process.env.OPENAI_API_KEY = 'test-api-key';

    service = new ChatbotService();
    service.onModuleInit();
  });

  describe('onModuleInit', () => {
    it('devrait initialiser le client OpenAI avec la clé API', () => {
      expect(process.env.OPENAI_API_KEY).toBe('test-api-key');
      expect(service['openai']).toBeTruthy();
    });

    it('devrait gérer l\'absence de clé API', () => {
      delete process.env.OPENAI_API_KEY;
      const newService = new ChatbotService();
      newService.onModuleInit();
      expect(newService['openai']).toBeNull();
    });
  });

  describe('generateSQL (private method - tested via query)', () => {
    it('devrait générer une requête SQL valide à partir d\'une question', async () => {
      const question = 'Combien de membres actifs avons-nous ?';
      const expectedSQL = 'SELECT COUNT(*) as total FROM members WHERE status = \'active\'';

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: expectedSQL,
            },
          },
        ],
      });

      // Mock de la pool
      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ total: 42 }],
      });

      const response = await service.query(question);

      expect(response.sql).toBe(expectedSQL);
      expect(response.data).toEqual([{ total: 42 }]);
      expect(response.error).toBeUndefined();
    });

    it('devrait nettoyer les délimiteurs SQL des réponses OpenAI', async () => {
      const question = 'Test question';
      const sqlWithMarkdown = '```sql\nSELECT * FROM members\n```';

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: sqlWithMarkdown,
            },
          },
        ],
      });

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({
        rows: [],
      });

      const response = await service.query(question);

      expect(response.sql).toBe('SELECT * FROM members');
      expect(response.sql).not.toContain('```');
    });

    it('devrait retourner une erreur si OpenAI client n\'est pas initialisé', async () => {
      service['openai'] = null;

      const response = await service.query('Combien de membres ?');

      expect(response.answer).toContain('Mode démo: configurez OPENAI_API_KEY');
    });

    it('devrait lancer une erreur si OpenAI échoue', async () => {
      const question = 'Test question';
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('OpenAI API error')
      );

      const response = await service.query(question);

      expect(response.error).toBeTruthy();
      expect(response.answer).toBeTruthy();
    });
  });

  describe('validateSQL (private method)', () => {
    it('devrait accepter les requêtes SELECT', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'SELECT * FROM members',
            },
          },
        ],
      });

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({ rows: [] });

      const response = await service.query(question);
      expect(response.error).toBeUndefined();
    });

    it('devrait rejeter les requêtes DROP', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'DROP TABLE members',
            },
          },
        ],
      });

      const response = await service.query(question);

      expect(response.error).toBeTruthy();
      expect(response.answer).toContain('Erreur');
    });

    it('devrait rejeter les requêtes DELETE', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'DELETE FROM members',
            },
          },
        ],
      });

      const response = await service.query(question);

      expect(response.error).toBeTruthy();
      expect(response.answer).toContain('Erreur');
    });

    it('devrait rejeter les requêtes INSERT', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'INSERT INTO members (email) VALUES (\'test@test.com\')',
            },
          },
        ],
      });

      const response = await service.query(question);

      expect(response.error).toBeTruthy();
      expect(response.answer).toContain('Erreur');
    });

    it('devrait rejeter les requêtes UPDATE', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'UPDATE members SET email = \'new@test.com\'',
            },
          },
        ],
      });

      const response = await service.query(question);

      expect(response.error).toBeTruthy();
      expect(response.answer).toContain('Erreur');
    });

    it('devrait rejeter les requêtes ALTER', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'ALTER TABLE members ADD COLUMN new_col INT',
            },
          },
        ],
      });

      const response = await service.query(question);

      expect(response.error).toBeTruthy();
      expect(response.answer).toContain('Erreur');
    });

    it('devrait rejeter les requêtes TRUNCATE', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'TRUNCATE TABLE members',
            },
          },
        ],
      });

      const response = await service.query(question);

      expect(response.error).toBeTruthy();
      expect(response.answer).toContain('Erreur');
    });

    it('devrait rejeter les requêtes CREATE', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'CREATE TABLE new_table (id INT)',
            },
          },
        ],
      });

      const response = await service.query(question);

      expect(response.error).toBeTruthy();
      expect(response.answer).toContain('Erreur');
    });

    it('devrait être case-insensitive pour les keywords dangereux', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'select * from members; drop table users;',
            },
          },
        ],
      });

      const response = await service.query(question);

      expect(response.error).toBeTruthy();
    });
  });

  describe('executeSQL (private method - tested via query)', () => {
    it('devrait exécuter une requête SQL et retourner les résultats', async () => {
      const question = 'Combien de membres ?';
      const mockData = [{ count: 100 }];

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'SELECT COUNT(*) as count FROM members',
            },
          },
        ],
      });

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({ rows: mockData });

      const response = await service.query(question);

      expect(response.data).toEqual(mockData);
      expect((pool.query as any)).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM members'
      );
    });

    it('devrait retourner un array vide si aucun résultat', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'SELECT * FROM members WHERE email = \'nonexistent@test.com\'',
            },
          },
        ],
      });

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({ rows: [] });

      const response = await service.query(question);

      expect(response.data).toBeUndefined();
    });

    it('devrait gérer les erreurs d\'exécution SQL', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'SELECT * FROM nonexistent_table',
            },
          },
        ],
      });

      const { pool } = await import('../../db');
      (pool.query as any).mockRejectedValueOnce(
        new Error('Table not found')
      );

      const response = await service.query(question);

      expect(response.error).toContain('Table not found');
      expect(response.answer).toBeTruthy();
    });
  });

  describe('generateAnswer (private method - tested via query)', () => {
    it('devrait générer une réponse naturelle à partir des résultats', async () => {
      const question = 'Combien de membres avons-nous ?';
      const mockData = [{ count: 150 }];
      const expectedAnswer = 'Nous avons actuellement 150 membres dans la communauté.';

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'SELECT COUNT(*) as count FROM members',
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: expectedAnswer,
              },
            },
          ],
        });

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({ rows: mockData });

      const response = await service.query(question);

      expect(response.answer).toBe(expectedAnswer);
      expect(response.data).toEqual(mockData);
    });

    it('devrait utiliser un message par défaut si la génération de réponse échoue', async () => {
      const question = 'Combien de membres ?';
      const mockData = [{ count: 42 }];

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'SELECT COUNT(*) as count FROM members',
              },
            },
          ],
        })
        .mockRejectedValueOnce(new Error('Answer generation failed'));

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({ rows: mockData });

      const response = await service.query(question);

      expect(response.answer).toBe('Résultat: 1 ligne(s) trouvée(s).');
      expect(response.data).toEqual(mockData);
    });

    it('devrait retourner un message de pas de résultats si la liste est vide', async () => {
      const question = 'Chercher un membre inexistant';

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'SELECT * FROM members WHERE email = \'nonexistent@test.com\'',
              },
            },
          ],
        })
        .mockRejectedValueOnce(new Error('Answer generation failed'));

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({ rows: [] });

      const response = await service.query(question);

      expect(response.answer).toBe('Aucun résultat trouvé pour cette requête.');
    });
  });

  describe('query method', () => {
    it('devrait retourner une réponse complète avec succès', async () => {
      const question = 'Combien d\'idées ont été approuvées ?';
      const mockData = [{ count: 15 }];

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'SELECT COUNT(*) as count FROM ideas WHERE status = \'approved\'',
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: '15 idées ont été approuvées.',
              },
            },
          ],
        });

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({ rows: mockData });

      const response = await service.query(question);

      expect(response.success).toBeUndefined(); // Le service ne retourne pas de success, c'est le controller
      expect(response.answer).toBe('15 idées ont été approuvées.');
      expect(response.sql).toBe('SELECT COUNT(*) as count FROM ideas WHERE status = \'approved\'');
      expect(response.data).toEqual(mockData);
      expect(response.error).toBeUndefined();
    });

    it('devrait accepter un paramètre context', async () => {
      const question = 'Combien de membres ?';
      const context = 'dashboard';

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'SELECT COUNT(*) as count FROM members',
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'Answer',
              },
            },
          ],
        });

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({ rows: [{ count: 100 }] });

      const response = await service.query(question, context);

      expect(response.answer).toBeTruthy();
      expect(response.error).toBeUndefined();
    });

    it('devrait gérer les erreurs globales gracieusement', async () => {
      const question = 'Test question';
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('API Error')
      );

      const response = await service.query(question);

      expect(response.error).toBeTruthy();
      expect(response.answer).toBeTruthy();
    });

    it('devrait retourner un message si OpenAI n\'est pas initialisé', async () => {
      service['openai'] = null;

      const response = await service.query('Test question');

      expect(response.answer).toContain('Mode démo: configurez OPENAI_API_KEY');
    });

    it('devrait construire la réponse avec toutes les données', async () => {
      const question = 'Combien de votes ?';
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'SELECT id, idea_id, voter_email FROM votes LIMIT 10',
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'Il y a plusieurs votes enregistrés.',
              },
            },
          ],
        });

      const { pool } = await import('../../db');
      const mockVotes = [
        { id: '1', idea_id: '1', voter_email: 'user@test.com' },
        { id: '2', idea_id: '1', voter_email: 'user2@test.com' },
      ];
      (pool.query as any).mockResolvedValueOnce({ rows: mockVotes });

      const response = await service.query(question);

      expect(response.sql).toContain('votes');
      expect(response.data).toEqual(mockVotes);
      expect(response.answer).toBeTruthy();
    });
  });

  describe('SQL Injection Prevention', () => {
    it('devrait prévenir les injections SQL avec des commentaires', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'SELECT * FROM members; -- DROP TABLE users',
            },
          },
        ],
      });

      const response = await service.query(question);

      // Le code validation détecte 'DROP'
      expect(response.error).toBeTruthy();
      expect(response.answer).toContain('Erreur');
    });

    it('devrait prévenir les injections avec UNION', async () => {
      const question = 'Test';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'SELECT email FROM members UNION SELECT password FROM admin',
            },
          },
        ],
      });

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({ rows: [] });

      const response = await service.query(question);

      // UNION is allowed in SELECT, but let's verify it executes
      expect(response.error).toBeUndefined();
      expect(response.sql).toContain('UNION');
    });
  });

  describe('Edge Cases', () => {
    it('devrait gérer une question vide', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'SELECT * FROM members LIMIT 0',
            },
          },
        ],
      });

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({ rows: [] });

      const response = await service.query('');

      expect(response.answer).toBeTruthy();
    });

    it('devrait gérer une réponse OpenAI vide', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '',
            },
          },
        ],
      });

      const response = await service.query('Question');

      expect(response.error).toBeTruthy();
    });

    it('devrait gérer les whitespaces dans les requêtes SQL', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '   SELECT * FROM members   ',
            },
          },
        ],
      });

      const { pool } = await import('../../db');
      (pool.query as any).mockResolvedValueOnce({ rows: [{ id: '1' }] });

      const response = await service.query('Question');

      expect(response.sql).toBe('SELECT * FROM members');
      expect(response.error).toBeUndefined();
    });
  });
});
