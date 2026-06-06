#!/usr/bin/env node

/**
 * CLI script to check Supabase connector
 * Usage: node scripts/checkSupabase.js
 *
 * Requires .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Load .env files
const envFiles = [
  path.join(rootDir, '.env'),
  path.join(rootDir, '.env.production'),
  path.join(rootDir, '.env.local')
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    console.log(`📄 Loading env from: ${envFile}`);
    dotenv.config({ path: envFile });
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const results = {
  timestamp: new Date().toISOString(),
  checks: {},
  errors: [],
  warnings: [],
  summary: {}
};

// 1. Configuration Check
console.log('\n📋 Checking configuration...');
results.checks.configuration = {
  urlConfigured: !!supabaseUrl,
  keyConfigured: !!supabaseKey,
  urlValue: supabaseUrl ? supabaseUrl.substring(0, 50) + '...' : 'NOT SET',
  appMode: process.env.VITE_APP_MODE || 'NOT SET'
};

if (!supabaseUrl) {
  results.errors.push('VITE_SUPABASE_URL tidak dikonfigurasi');
  printResults(results);
  process.exit(1);
}

if (!supabaseKey) {
  results.errors.push('VITE_SUPABASE_ANON_KEY tidak dikonfigurasi');
  printResults(results);
  process.exit(1);
}

console.log('✓ Configuration found');
results.summary.configurationStatus = 'OK';

// 2. Initialize Supabase client
console.log('\n🔧 Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);
results.checks.clientInitialization = { status: 'OK' };
console.log('✓ Client initialized');

// 3. Test connectivity
console.log('\n🔗 Testing connectivity...');
(async () => {
  try {
    const { error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116') {
        results.checks.connectivity = {
          status: 'OK',
          message: 'Connected (table users not yet created)'
        };
        console.log('✓ Connected to Supabase (table check)');
      } else {
        throw error;
      }
    } else {
      results.checks.connectivity = { status: 'OK' };
      console.log('✓ Connected to Supabase');
    }

    // 4. Check tables
    console.log('\n📊 Checking required tables...');
    const requiredTables = [
      'users',
      'daily_activities',
      'weekly_plans',
      'ai_scores',
      'supervisor_summaries',
      'extra_plans',
      'warnings',
      'rh_credentials'
    ];

    results.checks.tables = {};
    let existingCount = 0;
    let missingTables = [];

    for (const table of requiredTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(1);

        if (error && error.code === 'PGRST116') {
          console.log(`  ✗ ${table} (missing)`);
          missingTables.push(table);
          results.checks.tables[table] = 'MISSING';
        } else if (error) {
          console.log(`  ⚠ ${table} (exists, but ${error.message.substring(0, 40)}...)`);
          existingCount++;
          results.checks.tables[table] = 'EXISTS (RLS/Policy issue)';
        } else {
          console.log(`  ✓ ${table}`);
          existingCount++;
          results.checks.tables[table] = 'OK';
        }
      } catch (err) {
        console.log(`  ✗ ${table} (error: ${err.message.substring(0, 40)}...)`);
        results.checks.tables[table] = 'ERROR';
      }
    }

    results.summary.tablesStatus = missingTables.length === 0 ? 'OK' : 'INCOMPLETE';
    results.summary.existingTables = existingCount;
    results.summary.missingTables = missingTables.length;

    if (missingTables.length > 0) {
      results.warnings.push(
        `Tables missing: ${missingTables.join(', ')}`
      );
    }

    // 5. Test sample queries
    console.log('\n🔍 Testing sample queries...');
    try {
      const { data, count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .limit(5);

      if (error && error.code === 'PGRST116') {
        console.log('  • users table not yet created');
        results.checks.sampleQuery = 'users table not created';
      } else if (error) {
        console.log(`  • Query error: ${error.message.substring(0, 60)}...`);
        results.checks.sampleQuery = 'Query error';
      } else {
        console.log(`  ✓ Successfully read ${count || 0} users`);
        results.checks.sampleQuery = `${count || 0} records`;
      }
    } catch (err) {
      console.log(`  • Error: ${err.message.substring(0, 60)}...`);
      results.checks.sampleQuery = 'ERROR';
    }

    // Summary
    results.summary.overallStatus = missingTables.length === 0 ? 'READY' : 'PARTIAL';

    printResults(results);
    process.exit(0);
  } catch (err) {
    results.errors.push(`Connection test failed: ${err.message}`);
    results.summary.overallStatus = 'FAILED';
    printResults(results);
    process.exit(1);
  }
})();

function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUPABASE CONNECTOR CHECK RESULTS');
  console.log('='.repeat(60));

  console.log('\n✨ Summary:');
  console.log(`  Overall: ${results.summary.overallStatus}`);
  console.log(`  Config: ${results.summary.configurationStatus || 'OK'}`);
  console.log(`  Tables: ${results.summary.tablesStatus || 'N/A'} (${results.summary.existingTables || 0} exist, ${results.summary.missingTables || 0} missing)`);

  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(w => console.log(`  • ${w}`));
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(e => console.log(`  • ${e}`));
  }

  if (results.summary.overallStatus === 'READY') {
    console.log('\n✅ Supabase connector is ready!');
  } else if (results.summary.missingTables > 0) {
    console.log('\n💡 Next steps:');
    console.log('  1. Run SQL migrations in Supabase');
    console.log('  2. Check RH_SETUP_INSTRUCTIONS.md for SQL schema');
  }

  console.log('\n' + '='.repeat(60));
}
