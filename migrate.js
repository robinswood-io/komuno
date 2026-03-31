const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // Create tool_categories
    await p.query(`
      CREATE TABLE IF NOT EXISTS tool_categories (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT DEFAULT '#10b981',
        "order" INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS tool_categories_order_idx ON tool_categories ("order")`);
    await p.query(`CREATE INDEX IF NOT EXISTS tool_categories_active_idx ON tool_categories (is_active)`);
    console.log('✅ tool_categories créée');

    // Create tools
    await p.query(`
      CREATE TABLE IF NOT EXISTS tools (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id VARCHAR REFERENCES tool_categories(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        description TEXT,
        logo_url TEXT,
        price TEXT,
        link TEXT,
        tags TEXT[],
        is_featured BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by TEXT
      )
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS tools_category_idx ON tools (category_id)`);
    await p.query(`CREATE INDEX IF NOT EXISTS tools_featured_idx ON tools (is_featured)`);
    await p.query(`CREATE INDEX IF NOT EXISTS tools_active_idx ON tools (is_active)`);
    await p.query(`CREATE INDEX IF NOT EXISTS tools_order_idx ON tools ("order")`);
    console.log('✅ tools créée');

    // Fix financial_revenues: drop old, recreate with new schema
    // Check if old schema (has revenue_type column instead of type)
    const check = await p.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='financial_revenues' AND column_name='revenue_type'
    `);
    if (check.rows.length > 0) {
      console.log('🔄 Mise à jour schéma financial_revenues...');
      await p.query(`DROP TABLE IF EXISTS financial_revenues CASCADE`);
      await p.query(`
        CREATE TABLE financial_revenues (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          amount_in_cents INTEGER NOT NULL,
          revenue_date DATE NOT NULL,
          member_email TEXT,
          patron_id VARCHAR,
          payment_method TEXT,
          status TEXT NOT NULL DEFAULT 'confirmed',
          receipt_url TEXT,
          notes TEXT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      await p.query(`CREATE INDEX IF NOT EXISTS financial_revenues_type_idx ON financial_revenues (type)`);
      await p.query(`CREATE INDEX IF NOT EXISTS financial_revenues_revenue_date_idx ON financial_revenues (revenue_date DESC)`);
      await p.query(`CREATE INDEX IF NOT EXISTS financial_revenues_member_email_idx ON financial_revenues (member_email)`);
      await p.query(`CREATE INDEX IF NOT EXISTS financial_revenues_patron_id_idx ON financial_revenues (patron_id)`);
      await p.query(`CREATE INDEX IF NOT EXISTS financial_revenues_status_idx ON financial_revenues (status)`);
      await p.query(`CREATE INDEX IF NOT EXISTS financial_revenues_created_by_idx ON financial_revenues (created_by)`);
      console.log('✅ financial_revenues mis à jour');
    } else {
      console.log('ℹ️  financial_revenues schéma déjà correct');
    }

  } catch (err) {
    console.error('❌', err.message);
  } finally {
    await p.end();
  }
}
run();
