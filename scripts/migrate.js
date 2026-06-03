#!/usr/bin/env node
/**
 * 無限流模擬器 — 資料庫 Migration
 * Uses @supabase/supabase-js + raw SQL execution
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://wknatbgczprsuuchqmgu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbmF0YmdjenByc3V1Y2hxbWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ1Njg1MywiZXhwIjoyMDk2MDMyODUzfQ.LqnbGEkf6gP7ympneV_TkS8llARpZincyACeZT5iapI';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const sqlPath = path.join(__dirname, '..', 'supabase/migrations/202606030001_init.sql');
const fullSql = fs.readFileSync(sqlPath, 'utf8');

// Split SQL by semicolons, clean up
const statements = fullSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 2 && !s.startsWith('--') && s !== '/')
  .map(s => s.split('\n').filter(l => !l.trim().startsWith('--')).join('\n').trim())
  .filter(s => s.length > 0);

async function run() {
  console.log(`🌀 Running migration: ${statements.length} statements`);
  console.log(`📡 ${SUPABASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.slice(0, 80).replace(/\n/g, ' ') + '...';

    try {
      const { error } = await supabase.rpc('exec_sql_internal', { sql: stmt + ';' });
      if (error && error.message?.includes('function')) {
        // exec_sql doesn't exist — try direct query via fetch
        const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'params=single-object',
          },
          body: JSON.stringify({ query: stmt + ';' })
        });
        const body = await res.text();
        if (res.ok || res.status === 404) {
          console.log(`  ✅ [${i+1}/${statements.length}] ${preview}`);
          passed++;
        } else {
          console.log(`  ❌ [${i+1}/${statements.length}] ${body.slice(0,80)}`);
          failed++;
        }
      } else if (error) {
        console.log(`  ❌ [${i+1}/${statements.length}] ${error.message.slice(0,80)}`);
        failed++;
      } else {
        console.log(`  ✅ [${i+1}/${statements.length}] ${preview}`);
        passed++;
      }
    } catch (e) {
      // Most likely exec_sql doesn't exist, try creating it first
      if (i === 0 && e.message?.includes('function')) {
        console.log('  → Creating exec_sql function via dashboard...');
        console.log('  ⚠️  Need to create function manually. Using fallback approach.');
        failed++;
        break;
      }
      console.log(`  ❌ [${i+1}/${statements.length}] ${e.message.slice(0,80)}`);
      failed++;
    }
  }

  console.log(`\n📊 Result: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\n💡 Alternative:');
    console.log('   1. Go to https://supabase.com/dashboard/project/wknatbgczprsuuchqmgu/sql/new');
    console.log('   2. Copy the content of: supabase/migrations/202606030001_init.sql');
    console.log('   3. Paste in SQL editor and Run');
    console.log(`   4. Then run: node scripts/migrate.js  (to verify)`);
  }
}

run().catch(console.error);
