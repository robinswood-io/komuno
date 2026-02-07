#!/usr/bin/env bun
/**
 * Script pour créer un utilisateur de test en production
 * Usage: bun scripts/create-test-user.ts
 */

import { db } from '../server/db';
import { admins } from '../shared/schema';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

const TEST_USER = {
  email: 'admin@test.cjd80.fr',
  password: 'TestCJD2024!',
  role: 'super_admin' as const,
  name: 'Admin Test',
  company: 'CJD Amiens Test',
};

async function createTestUser() {
  try {
    console.log('🔐 Création utilisateur de test...');
    console.log(`Email: ${TEST_USER.email}`);
    console.log(`Password: ${TEST_USER.password}`);
    console.log('');

    // Vérifier si l'utilisateur existe déjà
    const existing = await db
      .select()
      .from(admins)
      .where(eq(admins.email, TEST_USER.email))
      .limit(1);

    if (existing.length > 0) {
      console.log('⚠️  Utilisateur existant trouvé, mise à jour du mot de passe...');

      // Hash du nouveau mot de passe
      const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);

      // Mise à jour
      await db
        .update(admins)
        .set({
          password: hashedPassword,
          status: 'active',
          isActive: true,
          role: TEST_USER.role,
          updatedAt: new Date(),
        })
        .where(eq(admins.email, TEST_USER.email));

      console.log('✅ Mot de passe mis à jour');
    } else {
      console.log('📝 Création du nouvel utilisateur...');

      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);

      // Insertion
      await db.insert(admins).values({
        email: TEST_USER.email,
        password: hashedPassword,
        role: TEST_USER.role,
        status: 'active',
        isActive: true,
        name: TEST_USER.name,
        company: TEST_USER.company,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ Utilisateur créé');
    }

    console.log('');
    console.log('🎯 Credentials de test:');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Changez ce mot de passe en production!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

createTestUser();
