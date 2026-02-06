import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, and } from 'drizzle-orm';
import { StorageService } from '../common/storage/storage.service';
import {
  toolCategories,
  tools,
  InsertToolCategory,
  UpdateToolCategory,
  InsertTool,
  UpdateTool,
  ToolCategory,
  Tool,
  ToolWithCategory,
} from '../../../shared/schema';

@Injectable()
export class ToolsService {
  constructor(private readonly storage: StorageService) {}

  // =====================
  // CATEGORIES
  // =====================

  async getAllCategories(includeInactive = false): Promise<ToolCategory[]> {
    const db = this.storage.getDb();

    if (includeInactive) {
      return db
        .select()
        .from(toolCategories)
        .orderBy(asc(toolCategories.order), asc(toolCategories.name));
    }

    return db
      .select()
      .from(toolCategories)
      .where(eq(toolCategories.isActive, true))
      .orderBy(asc(toolCategories.order), asc(toolCategories.name));
  }

  async getCategoryById(id: string): Promise<ToolCategory | null> {
    const db = this.storage.getDb();
    const [category] = await db
      .select()
      .from(toolCategories)
      .where(eq(toolCategories.id, id));
    return category || null;
  }

  async createCategory(data: InsertToolCategory): Promise<ToolCategory> {
    const db = this.storage.getDb();
    const [category] = await db
      .insert(toolCategories)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return category;
  }

  async updateCategory(id: string, data: UpdateToolCategory): Promise<ToolCategory> {
    const db = this.storage.getDb();
    const [category] = await db
      .update(toolCategories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(toolCategories.id, id))
      .returning();

    if (!category) {
      throw new NotFoundException(`Catégorie ${id} non trouvée`);
    }

    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const db = this.storage.getDb();

    // D'abord, mettre à null le categoryId des outils liés
    await db
      .update(tools)
      .set({ categoryId: null, updatedAt: new Date() })
      .where(eq(tools.categoryId, id));

    // Puis supprimer la catégorie
    const result = await db
      .delete(toolCategories)
      .where(eq(toolCategories.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundException(`Catégorie ${id} non trouvée`);
    }
  }

  // =====================
  // TOOLS
  // =====================

  async getAllTools(includeInactive = false): Promise<ToolWithCategory[]> {
    const db = this.storage.getDb();

    const condition = includeInactive
      ? undefined
      : eq(tools.isActive, true);

    const toolsList = await db
      .select({
        tool: tools,
        category: toolCategories,
      })
      .from(tools)
      .leftJoin(toolCategories, eq(tools.categoryId, toolCategories.id))
      .where(condition)
      .orderBy(asc(tools.order), asc(tools.name));

    return toolsList.map(({ tool, category }) => ({
      ...tool,
      category,
    }));
  }

  async getToolsByCategory(categoryId: string, includeInactive = false): Promise<Tool[]> {
    const db = this.storage.getDb();

    const conditions = includeInactive
      ? eq(tools.categoryId, categoryId)
      : and(eq(tools.categoryId, categoryId), eq(tools.isActive, true));

    return db
      .select()
      .from(tools)
      .where(conditions)
      .orderBy(asc(tools.order), asc(tools.name));
  }

  async getFeaturedTools(): Promise<ToolWithCategory[]> {
    const db = this.storage.getDb();

    const toolsList = await db
      .select({
        tool: tools,
        category: toolCategories,
      })
      .from(tools)
      .leftJoin(toolCategories, eq(tools.categoryId, toolCategories.id))
      .where(and(eq(tools.isFeatured, true), eq(tools.isActive, true)))
      .orderBy(asc(tools.order), asc(tools.name));

    return toolsList.map(({ tool, category }) => ({
      ...tool,
      category,
    }));
  }

  async getToolById(id: string): Promise<ToolWithCategory | null> {
    const db = this.storage.getDb();
    const [result] = await db
      .select({
        tool: tools,
        category: toolCategories,
      })
      .from(tools)
      .leftJoin(toolCategories, eq(tools.categoryId, toolCategories.id))
      .where(eq(tools.id, id));

    if (!result) return null;

    return {
      ...result.tool,
      category: result.category,
    };
  }

  async createTool(data: InsertTool): Promise<Tool> {
    const db = this.storage.getDb();
    const [tool] = await db
      .insert(tools)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return tool;
  }

  async updateTool(id: string, data: UpdateTool): Promise<Tool> {
    const db = this.storage.getDb();
    const [tool] = await db
      .update(tools)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tools.id, id))
      .returning();

    if (!tool) {
      throw new NotFoundException(`Outil ${id} non trouvé`);
    }

    return tool;
  }

  async deleteTool(id: string): Promise<void> {
    const db = this.storage.getDb();
    const result = await db
      .delete(tools)
      .where(eq(tools.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundException(`Outil ${id} non trouvé`);
    }
  }

  // =====================
  // STATS
  // =====================

  async getStats(): Promise<{ categoriesCount: number; toolsCount: number; featuredCount: number }> {
    const db = this.storage.getDb();

    const [categoriesResult] = await db
      .select({ count: toolCategories.id })
      .from(toolCategories)
      .where(eq(toolCategories.isActive, true));

    const [toolsResult] = await db
      .select({ count: tools.id })
      .from(tools)
      .where(eq(tools.isActive, true));

    const [featuredResult] = await db
      .select({ count: tools.id })
      .from(tools)
      .where(and(eq(tools.isFeatured, true), eq(tools.isActive, true)));

    // Note: count returns the id here, we need proper count
    const categories = await db.select().from(toolCategories).where(eq(toolCategories.isActive, true));
    const allTools = await db.select().from(tools).where(eq(tools.isActive, true));
    const featured = await db.select().from(tools).where(and(eq(tools.isFeatured, true), eq(tools.isActive, true)));

    return {
      categoriesCount: categories.length,
      toolsCount: allTools.length,
      featuredCount: featured.length,
    };
  }
}
