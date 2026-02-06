/**
 * Script pour ajouter des relations de test entre les membres
 * Cela permettra de mieux visualiser le graphe de relations
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://cjd80_user:cjd80_pass@postgres:5432/cjd80_db';

async function addTestRelations() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔍 Récupération des membres existants...');

    // Récupérer les emails des membres
    const members = await sql`
      SELECT email, first_name, last_name
      FROM members
      WHERE status = 'active'
      ORDER BY email
      LIMIT 20
    `;

    if (members.length < 3) {
      console.log('❌ Pas assez de membres pour créer des relations (minimum 3)');
      await sql.end();
      return;
    }

    console.log(`✅ ${members.length} membres trouvés`);

    // Compter les relations existantes
    const existingRelations = await sql`
      SELECT COUNT(*)::int as count
      FROM member_relations
    `;

    console.log(`📊 Relations existantes: ${existingRelations[0].count}`);

    // Créer un réseau de relations intéressant
    const relations = [];

    // Pattern 1: Chaîne de parrainages (5 relations)
    for (let i = 0; i < Math.min(5, members.length - 1); i++) {
      relations.push({
        memberEmail: members[i].email,
        relatedMemberEmail: members[i + 1].email,
        relationType: 'sponsor',
        description: `${members[i].first_name} a parrainé ${members[i + 1].first_name}`,
        createdBy: 'admin@test.local',
      });
    }

    // Pattern 2: Équipes (groupes de 3-4 personnes)
    if (members.length >= 8) {
      // Équipe 1
      relations.push({
        memberEmail: members[5].email,
        relatedMemberEmail: members[6].email,
        relationType: 'team',
        description: 'Membres de la même équipe projet',
        createdBy: 'admin@test.local',
      });
      relations.push({
        memberEmail: members[6].email,
        relatedMemberEmail: members[7].email,
        relationType: 'team',
        description: 'Membres de la même équipe projet',
        createdBy: 'admin@test.local',
      });
      relations.push({
        memberEmail: members[5].email,
        relatedMemberEmail: members[7].email,
        relationType: 'team',
        description: 'Membres de la même équipe projet',
        createdBy: 'admin@test.local',
      });
    }

    // Pattern 3: Relations personnalisées (hub central)
    if (members.length >= 12) {
      const hubMember = members[10]; // Un membre central
      for (let i = 0; i < 3; i++) {
        if (members[i + 11]) {
          relations.push({
            memberEmail: hubMember.email,
            relatedMemberEmail: members[i + 11].email,
            relationType: 'custom',
            description: 'Relation professionnelle',
            createdBy: 'admin@test.local',
          });
        }
      }
    }

    // Pattern 4: Connexions croisées pour densifier
    if (members.length >= 15) {
      relations.push({
        memberEmail: members[2].email,
        relatedMemberEmail: members[8].email,
        relationType: 'custom',
        description: 'Anciens collègues',
        createdBy: 'admin@test.local',
      });
      relations.push({
        memberEmail: members[3].email,
        relatedMemberEmail: members[12].email,
        relationType: 'sponsor',
        description: 'Parrainage',
        createdBy: 'admin@test.local',
      });
    }

    console.log(`\n📝 Création de ${relations.length} nouvelles relations...`);

    let created = 0;
    let skipped = 0;

    for (const relation of relations) {
      try {
        // Vérifier si la relation existe déjà (dans les deux sens)
        const existing = await sql`
          SELECT id FROM member_relations
          WHERE (
            (member_email = ${relation.memberEmail} AND related_member_email = ${relation.relatedMemberEmail})
            OR
            (member_email = ${relation.relatedMemberEmail} AND related_member_email = ${relation.memberEmail})
          )
          LIMIT 1
        `;

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Insérer la relation
        await sql`
          INSERT INTO member_relations (
            member_email,
            related_member_email,
            relation_type,
            description,
            created_by,
            created_at
          ) VALUES (
            ${relation.memberEmail},
            ${relation.relatedMemberEmail},
            ${relation.relationType},
            ${relation.description},
            ${relation.createdBy},
            NOW()
          )
        `;

        created++;
        console.log(`  ✓ ${relation.memberEmail} → ${relation.relatedMemberEmail} (${relation.relationType})`);
      } catch (error) {
        console.error(`  ✗ Erreur pour ${relation.memberEmail} → ${relation.relatedMemberEmail}:`, error);
      }
    }

    console.log(`\n✅ Relations créées: ${created}`);
    console.log(`⏭️  Relations ignorées (déjà existantes): ${skipped}`);

    // Afficher le résumé final
    const finalCount = await sql`
      SELECT COUNT(*)::int as count
      FROM member_relations
    `;

    const byType = await sql`
      SELECT
        relation_type,
        COUNT(*)::int as count
      FROM member_relations
      GROUP BY relation_type
      ORDER BY count DESC
    `;

    console.log(`\n📊 RÉSUMÉ FINAL:`);
    console.log(`   Total relations: ${finalCount[0].count}`);
    byType.forEach((row: any) => {
      console.log(`   - ${row.relation_type}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await sql.end();
  }
}

addTestRelations();
