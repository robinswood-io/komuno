import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { z } from 'zod';
import { memberStatuses } from '../../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// Schémas de validation
const createStatusSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Le code doit contenir uniquement des lettres minuscules, chiffres et underscores'),
  label: z.string().min(1).max(100),
  category: z.enum(['member', 'prospect']),
  color: z.string().min(1).max(20),
  description: z.string().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const updateStatusSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  color: z.string().min(1).max(20).optional(),
  description: z.string().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Service Member Statuses - Gestion des statuts personnalisables
 */
@Injectable()
export class MemberStatusesService {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Lister tous les statuts (actifs et inactifs)
   */
  async listStatuses(filters?: { category?: string; isActive?: boolean }) {
    try {
      const storage = this.storageService.instance as any;
      const db = storage.db;

      let query = db.select().from(memberStatuses);

      const conditions = [];
      if (filters?.category) {
        conditions.push(eq(memberStatuses.category, filters.category));
      }
      if (filters?.isActive !== undefined) {
        conditions.push(eq(memberStatuses.isActive, filters.isActive));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const statuses = await query.orderBy(memberStatuses.displayOrder, memberStatuses.createdAt);

      return { success: true, data: statuses };
    } catch (error) {
      throw new BadRequestException('Erreur lors de la récupération des statuts');
    }
  }

  /**
   * Obtenir un statut par ID
   */
  async getStatusById(id: string) {
    try {
      const storage = this.storageService.instance as any;
      const db = storage.db;

      const [status] = await db
        .select()
        .from(memberStatuses)
        .where(eq(memberStatuses.id, id))
        .limit(1);

      if (!status) {
        throw new NotFoundException(`Statut ${id} non trouvé`);
      }

      return { success: true, data: status };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la récupération du statut');
    }
  }

  /**
   * Créer un nouveau statut personnalisé
   */
  async createStatus(data: unknown) {
    try {
      const validatedData = createStatusSchema.parse(data);
      const storage = this.storageService.instance as any;
      const db = storage.db;

      // Vérifier que le code n'existe pas déjà
      const [existing] = await db
        .select()
        .from(memberStatuses)
        .where(eq(memberStatuses.code, validatedData.code))
        .limit(1);

      if (existing) {
        throw new ConflictException(`Un statut avec le code "${validatedData.code}" existe déjà`);
      }

      // Déterminer l'ordre d'affichage par défaut
      let displayOrder = validatedData.displayOrder;
      if (displayOrder === undefined) {
        const [maxOrder] = await db
          .select({ max: sql<number>`MAX(${memberStatuses.displayOrder})` })
          .from(memberStatuses)
          .where(eq(memberStatuses.category, validatedData.category));

        displayOrder = (maxOrder?.max ?? 0) + 1;
      }

      const [newStatus] = await db
        .insert(memberStatuses)
        .values({
          code: validatedData.code,
          label: validatedData.label,
          category: validatedData.category,
          color: validatedData.color,
          description: validatedData.description || null,
          displayOrder,
          isSystem: false, // Les statuts créés manuellement ne sont jamais system
          isActive: true,
        })
        .returning();

      return { success: true, data: newStatus };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la création du statut');
    }
  }

  /**
   * Mettre à jour un statut existant
   */
  async updateStatus(id: string, data: unknown) {
    try {
      const validatedData = updateStatusSchema.parse(data);
      const storage = this.storageService.instance as any;
      const db = storage.db;

      // Vérifier que le statut existe
      const [existing] = await db
        .select()
        .from(memberStatuses)
        .where(eq(memberStatuses.id, id))
        .limit(1);

      if (!existing) {
        throw new NotFoundException(`Statut ${id} non trouvé`);
      }

      // Vérifier que ce n'est pas un statut système si on tente de le modifier
      if (existing.isSystem) {
        // Les statuts système peuvent seulement changer leur label et color
        if (validatedData.displayOrder !== undefined || validatedData.isActive !== undefined) {
          throw new BadRequestException('Les statuts système ne peuvent pas être désactivés ou réordonnés');
        }
      }

      const [updatedStatus] = await db
        .update(memberStatuses)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(memberStatuses.id, id))
        .returning();

      return { success: true, data: updatedStatus };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la mise à jour du statut');
    }
  }

  /**
   * Supprimer un statut (seulement si non-système et non utilisé)
   */
  async deleteStatus(id: string) {
    try {
      const storage = this.storageService.instance as any;
      const db = storage.db;

      // Vérifier que le statut existe
      const [existing] = await db
        .select()
        .from(memberStatuses)
        .where(eq(memberStatuses.id, id))
        .limit(1);

      if (!existing) {
        throw new NotFoundException(`Statut ${id} non trouvé`);
      }

      // Interdire la suppression des statuts système
      if (existing.isSystem) {
        throw new BadRequestException('Les statuts système ne peuvent pas être supprimés');
      }

      // Vérifier qu'aucun membre n'utilise ce statut
      const { members } = await import('../../../shared/schema');
      const membersWithStatus = await db.query.members.findFirst({
        where: (membersTable: typeof members.$inferSelect, helpers: any) => helpers.eq(membersTable.status, existing.code),
      });

      if (membersWithStatus) {
        throw new BadRequestException(
          `Ce statut ne peut pas être supprimé car il est utilisé par au moins un membre. Désactivez-le plutôt.`
        );
      }

      await db
        .delete(memberStatuses)
        .where(eq(memberStatuses.id, id));

      return { success: true, message: 'Statut supprimé avec succès' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la suppression du statut');
    }
  }

  /**
   * Réordonner les statuts (changer displayOrder)
   */
  async reorderStatuses(data: { id: string; displayOrder: number }[]) {
    try {
      const storage = this.storageService.instance as any;
      const db = storage.db;

      // Mettre à jour chaque statut avec son nouvel ordre
      for (const item of data) {
        await db
          .update(memberStatuses)
          .set({ displayOrder: item.displayOrder, updatedAt: new Date() })
          .where(eq(memberStatuses.id, item.id));
      }

      return { success: true, message: 'Ordre des statuts mis à jour' };
    } catch (error) {
      throw new BadRequestException('Erreur lors du réordonnancement des statuts');
    }
  }
}
