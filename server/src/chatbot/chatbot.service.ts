import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import { logger } from '../../lib/logger';
import { pool } from '../../db';

// Schéma de la base de données pour le contexte
const DATABASE_SCHEMA = `
Tables disponibles dans la base de données CJD Amiens:

1. members - Membres de la communauté
   - id (uuid)
   - email (text, unique)
   - first_name (text)
   - last_name (text)
   - company (text, nullable)
   - phone (text, nullable)
   - role (text, nullable)
   - cjd_role (text, nullable)
   - status (text: 'active' | 'proposed')
   - engagement_score (integer)
   - first_seen_at (timestamp)
   - last_activity_at (timestamp)
   - activity_count (integer)
   - created_at (timestamp)
   - updated_at (timestamp)

2. member_activities - Activités des membres
   - id (uuid)
   - member_email (text, FK -> members.email)
   - activity_type (text: 'idea_proposed' | 'vote_cast' | 'event_registered' | 'event_unregistered' | 'patron_suggested')
   - entity_type (text: 'idea' | 'vote' | 'event' | 'patron')
   - entity_id (varchar, nullable)
   - entity_title (text, nullable)
   - score_impact (integer)
   - occurred_at (timestamp)

3. ideas - Idées proposées
   - id (uuid)
   - title (text)
   - description (text)
   - status (text: 'pending' | 'approved' | 'rejected' | 'under_review' | 'postponed' | 'completed')
   - proposed_by (text)
   - created_at (timestamp)
   - updated_at (timestamp)

4. votes - Votes sur les idées
   - id (uuid)
   - idea_id (uuid, FK -> ideas.id)
   - voter_email (text)
   - created_at (timestamp)

5. events - Événements
   - id (uuid)
   - title (text)
   - description (text)
   - date (timestamp)
   - status (text: 'draft' | 'published' | 'cancelled' | 'postponed' | 'completed')
   - created_at (timestamp)
   - updated_at (timestamp)

6. inscriptions - Inscriptions aux événements
   - id (uuid)
   - event_id (uuid, FK -> events.id)
   - email (text)
   - created_at (timestamp)

7. patrons - Mécènes
   - id (uuid)
   - first_name (text)
   - last_name (text)
   - email (text, unique)
   - company (text, nullable)
   - phone (text, nullable)
   - status (text: 'active' | 'inactive')
   - created_at (timestamp)
   - updated_at (timestamp)
`;

interface ChatbotResponse {
  answer: string;
  sql?: string;
  data?: any[];
  error?: string;
}

@Injectable()
export class ChatbotService implements OnModuleInit {
  private openai: OpenAI | null = null;

  onModuleInit() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      logger.info('[ChatbotService] OpenAI client initialized');
    } else {
      logger.warn('[ChatbotService] OpenAI API key not found, chatbot service will be disabled');
    }
  }

  /**
   * Génère une requête SQL à partir d'une question en langage naturel
   */
  private async generateSQL(question: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const systemPrompt = `Tu es un assistant SQL expert pour une base de données PostgreSQL.
Tu dois générer des requêtes SQL sûres et efficaces à partir de questions en français.

Règles importantes:
1. Utilise UNIQUEMENT les tables et colonnes listées dans le schéma
2. Ne génère JAMAIS de requêtes DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE
3. Utilise UNIQUEMENT SELECT pour interroger les données
4. Retourne UNIQUEMENT la requête SQL, sans explication
5. Utilise des noms de colonnes en snake_case comme dans le schéma

Schéma de la base de données:
${DATABASE_SCHEMA}

Réponds UNIQUEMENT avec la requête SQL, rien d'autre.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Question: ${question}\n\nGénère la requête SQL correspondante:` }
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const sqlQuery = response.choices[0]?.message?.content?.trim() || '';
      const cleanedSQL = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
      
      this.validateSQL(cleanedSQL);
      return cleanedSQL;
    } catch (error) {
      logger.error('[ChatbotService] Error generating SQL', { error, question });
      throw new Error('Erreur lors de la génération de la requête SQL');
    }
  }

  /**
   * Valide que la requête SQL est sûre (SELECT uniquement)
   */
  private validateSQL(query: string): void {
    const upperQuery = query.toUpperCase().trim();
    
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];
    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        throw new Error(`Requête SQL non autorisée: ${keyword} détecté`);
      }
    }
    
    if (!upperQuery.startsWith('SELECT')) {
      throw new Error('Seules les requêtes SELECT sont autorisées');
    }
  }

  /**
   * Exécute une requête SQL de manière sécurisée
   */
  private async executeSQL(sqlQuery: string): Promise<any[]> {
    try {
      const result = await (pool as any).query(sqlQuery);
      return result.rows || [];
    } catch (error) {
      logger.error('[ChatbotService] Error executing SQL', { error, sqlQuery });
      throw new Error(`Erreur lors de l'exécution de la requête: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Génère une réponse naturelle à partir des résultats SQL
   */
  private async generateAnswer(question: string, sqlQuery: string, data: any[]): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un assistant qui explique les résultats de requêtes SQL de manière naturelle en français. Réponds de façon claire et concise.' 
          },
          { 
            role: 'user', 
            content: `Question: ${question}\nRequête SQL: ${sqlQuery}\nRésultats: ${JSON.stringify(data, null, 2)}\n\nGénère une réponse naturelle en français.` 
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content?.trim() || 'Aucune réponse générée';
    } catch (error) {
      logger.error('[ChatbotService] Error generating answer', { error });
      return data.length === 0 
        ? 'Aucun résultat trouvé pour cette requête.' 
        : `Résultat: ${data.length} ligne(s) trouvée(s).`;
    }
  }

  /**
   * Traite une question et retourne une réponse avec les données
   */
  async query(question: string, context?: string): Promise<ChatbotResponse> {
    if (!this.openai) {
      if (process.env.NODE_ENV !== 'production') {
        return {
          answer: 'Mode démo: configurez OPENAI_API_KEY pour activer l\'assistant.',
          sql: 'SELECT 1;',
          data: [],
        };
      }

      return {
        answer: 'Le service chatbot n\'est pas disponible. Veuillez configurer OPENAI_API_KEY.',
        error: 'OpenAI client not initialized',
      };
    }

    try {
      const sqlQuery = await this.generateSQL(question);
      const data = await this.executeSQL(sqlQuery);
      const answer = await this.generateAnswer(question, sqlQuery, data);
      
      return {
        answer,
        sql: sqlQuery,
        data: data.length > 0 ? data : undefined,
      };
    } catch (error) {
      logger.error('[ChatbotService] Query error', { error, question });
      return {
        answer: error instanceof Error ? error.message : 'Une erreur est survenue lors du traitement de votre question.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
