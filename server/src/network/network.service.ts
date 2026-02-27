import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { eq, or, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { networkConnections, insertNetworkConnectionSchema, members, patrons } from '../../../shared/schema';

export interface NetworkConnectionWithDetails {
  id: string;
  connectedEmail: string;
  connectedType: 'member' | 'patron';
  firstName: string;
  lastName: string;
  company?: string | null;
  createdAt: Date;
}

@Injectable()
export class NetworkService {
  async getConnections(ownerEmail: string): Promise<NetworkConnectionWithDetails[]> {
    // Get all connections where this entity is owner OR connected
    const rows = await db
      .select()
      .from(networkConnections)
      .where(
        or(
          eq(networkConnections.ownerEmail, ownerEmail),
          eq(networkConnections.connectedEmail, ownerEmail),
        )
      )
      .orderBy(desc(networkConnections.createdAt));

    const results: NetworkConnectionWithDetails[] = [];

    for (const row of rows) {
      // Determine the "other" entity
      const isOwner = row.ownerEmail === ownerEmail;
      const otherEmail = isOwner ? row.connectedEmail : row.ownerEmail;
      const otherType = isOwner ? row.connectedType : row.ownerType;

      if (otherType === 'member') {
        const [member] = await db.select().from(members).where(eq(members.email, otherEmail)).limit(1);
        if (member) {
          results.push({
            id: row.id,
            connectedEmail: otherEmail,
            connectedType: 'member',
            firstName: member.firstName,
            lastName: member.lastName,
            company: member.company,
            createdAt: row.createdAt,
          });
        }
      } else {
        const [patron] = await db.select().from(patrons).where(eq(patrons.email, otherEmail)).limit(1);
        if (patron) {
          results.push({
            id: row.id,
            connectedEmail: otherEmail,
            connectedType: 'patron',
            firstName: patron.firstName,
            lastName: patron.lastName,
            company: patron.company,
            createdAt: row.createdAt,
          });
        }
      }
    }

    return results;
  }

  async createConnection(data: unknown, userEmail?: string) {
    try {
      const validated = insertNetworkConnectionSchema.parse(data);

      if (validated.ownerEmail === validated.connectedEmail) {
        throw new BadRequestException('Une entité ne peut pas être liée à elle-même');
      }

      const [created] = await db
        .insert(networkConnections)
        .values({
          ownerEmail: validated.ownerEmail,
          ownerType: validated.ownerType,
          connectedEmail: validated.connectedEmail,
          connectedType: validated.connectedType,
          createdBy: userEmail,
        })
        .returning();

      return { success: true, data: created };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      // Unique constraint violation
      if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === '23505') {
        throw new ConflictException('Cette connexion existe déjà');
      }
      throw error;
    }
  }

  async deleteConnection(id: string) {
    const [deleted] = await db
      .delete(networkConnections)
      .where(eq(networkConnections.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Connexion non trouvée');
    }

    return { success: true };
  }
}
