import { createClient } from '@supabase/supabase-js';

/**
 * Comprehensive Supabase connector checker
 * Verifies configuration, connectivity, tables, and RLS policies
 */

export async function checkSupabaseConnector() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
    warnings: [],
    summary: {}
  };

  // 1. Configuration Check
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  results.checks.configuration = {
    urlConfigured: !!supabaseUrl,
    keyConfigured: !!supabaseKey,
    urlValue: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
    appMode: import.meta.env.VITE_APP_MODE || 'NOT SET'
  };

  if (!supabaseUrl) {
    results.errors.push('VITE_SUPABASE_URL tidak dikonfigurasi di .env');
    results.summary.configurationStatus = 'FAILED';
    return results;
  }

  if (!supabaseKey) {
    results.errors.push('VITE_SUPABASE_ANON_KEY tidak dikonfigurasi di .env');
    results.summary.configurationStatus = 'FAILED';
    return results;
  }

  results.summary.configurationStatus = 'OK';

  // 2. Client Initialization Check
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    results.checks.clientInitialization = {
      status: 'OK',
      message: 'Supabase client berhasil diinisialisasi'
    };

    // 3. Connectivity Check (via health check)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        if (error.code === 'PGRST116') {
          // Table doesn't exist - still good connectivity
          results.checks.connectivity = {
            status: 'OK',
            message: 'Koneksi ke Supabase berhasil (tabel users belum ada)',
            httpStatus: error.code
          };
        } else {
          throw error;
        }
      } else {
        results.checks.connectivity = {
          status: 'OK',
          message: 'Koneksi ke Supabase berhasil',
          userCount: data?.length || 0
        };
      }
    } catch (connError) {
      results.errors.push(`Gagal terhubung ke Supabase: ${connError.message}`);
      results.checks.connectivity = {
        status: 'FAILED',
        error: connError.message
      };
      results.summary.connectivityStatus = 'FAILED';
      return results;
    }

    // 4. Table Existence Check
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
    const existingTables = [];
    const missingTables = [];

    for (const table of requiredTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(1);

        if (error && error.code === 'PGRST116') {
          // Table doesn't exist
          missingTables.push(table);
          results.checks.tables[table] = { status: 'MISSING' };
        } else if (error) {
          // Other error (RLS denied, etc)
          existingTables.push(table);
          results.checks.tables[table] = {
            status: 'EXISTS (RLS/Policy issue)',
            error: error.message?.substring(0, 100)
          };
        } else {
          // Table exists and accessible
          existingTables.push(table);
          results.checks.tables[table] = { status: 'OK' };
        }
      } catch (err) {
        results.checks.tables[table] = {
          status: 'ERROR',
          error: err.message
        };
      }
    }

    if (missingTables.length > 0) {
      results.warnings.push(
        `Tabel yang belum dibuat: ${missingTables.join(', ')}`
      );
    }

    results.summary.tablesStatus = missingTables.length === 0 ? 'OK' : 'INCOMPLETE';
    results.summary.existingTables = existingTables;
    results.summary.missingTables = missingTables;

    // 5. RLS Policies Check (sampled from one table)
    results.checks.rlsPolicies = {};
    if (existingTables.length > 0) {
      try {
        // Try to detect RLS by attempting a query that would fail with RLS
        const { error } = await supabase
          .from(existingTables[0])
          .select('*')
          .limit(1);

        if (error && error.message.includes('policy')) {
          results.checks.rlsPolicies[existingTables[0]] = {
            status: 'RLS ENABLED',
            message: 'Row Level Security aktif pada tabel ini'
          };
        } else {
          results.checks.rlsPolicies[existingTables[0]] = {
            status: 'RLS status tidak jelas',
            note: 'Mungkin RLS disabled atau akses terbatas oleh policy'
          };
        }
      } catch (err) {
        results.checks.rlsPolicies.error = err.message;
      }
    }

    // 6. Test Sample Query
    results.checks.sampleQuery = {};
    try {
      // Test fetch users
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .limit(5);

      if (error) {
        if (error.code === 'PGRST116') {
          results.checks.sampleQuery.users = {
            status: 'TABLE_NOT_FOUND',
            message: 'Tabel users belum dibuat'
          };
        } else {
          results.checks.sampleQuery.users = {
            status: 'QUERY_ERROR',
            error: error.message.substring(0, 150)
          };
        }
      } else {
        results.checks.sampleQuery.users = {
          status: 'OK',
          recordCount: count || 0,
          message: `Berhasil membaca ${count || 0} pengguna`
        };
      }
    } catch (err) {
      results.checks.sampleQuery.users = {
        status: 'ERROR',
        error: err.message
      };
    }

    // 7. Auth/Anonymous Client Check
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      results.checks.authentication = {
        authenticated: !!user,
        message: user ? `Authenticated as: ${user.email}` : 'Using anonymous/service access'
      };
    } catch (err) {
      results.checks.authentication = {
        status: 'Note',
        message: 'Auth check: ' + err.message.substring(0, 100)
      };
    }

    results.summary.overallStatus = 'OK';
  } catch (err) {
    results.errors.push(`Gagal menginisialisasi Supabase client: ${err.message}`);
    results.summary.overallStatus = 'FAILED';
  }

  return results;
}

/**
 * Format check results untuk display
 */
export function formatCheckResults(results) {
  const lines = [];

  lines.push('╔════════════════════════════════════════════════════════╗');
  lines.push('║         SUPABASE CONNECTOR CHECK RESULTS               ║');
  lines.push('╚════════════════════════════════════════════════════════╝');
  lines.push('');

  // Summary
  lines.push('📊 RINGKASAN:');
  lines.push(`  Overall Status: ${results.summary.overallStatus || 'UNKNOWN'}`);
  lines.push(`  Configuration: ${results.summary.configurationStatus || 'UNKNOWN'}`);
  lines.push(`  Connectivity: ${results.summary.connectivityStatus || results.checks.connectivity?.status || 'UNKNOWN'}`);
  lines.push(`  Tables: ${results.summary.tablesStatus || 'UNKNOWN'}`);
  lines.push('');

  // Configuration
  if (results.checks.configuration) {
    lines.push('⚙️  KONFIGURASI:');
    lines.push(`  URL Configured: ${results.checks.configuration.urlConfigured ? '✓' : '✗'}`);
    lines.push(`  URL: ${results.checks.configuration.urlValue}`);
    lines.push(`  Key Configured: ${results.checks.configuration.keyConfigured ? '✓' : '✗'}`);
    lines.push(`  App Mode: ${results.checks.configuration.appMode}`);
    lines.push('');
  }

  // Connectivity
  if (results.checks.connectivity) {
    lines.push('🔗 KONEKTIVITAS:');
    lines.push(`  Status: ${results.checks.connectivity.status}`);
    lines.push(`  Message: ${results.checks.connectivity.message}`);
    if (results.checks.connectivity.userCount !== undefined) {
      lines.push(`  User Count: ${results.checks.connectivity.userCount}`);
    }
    lines.push('');
  }

  // Tables
  if (results.checks.tables && Object.keys(results.checks.tables).length > 0) {
    lines.push('📋 TABEL DATABASE:');
    for (const [table, status] of Object.entries(results.checks.tables)) {
      const icon = status.status === 'OK' ? '✓' : status.status === 'MISSING' ? '✗' : '⚠';
      lines.push(`  ${icon} ${table}: ${status.status}`);
      if (status.error) {
        lines.push(`     └─ ${status.error}`);
      }
    }
    lines.push('');
  }

  // Sample Query Results
  if (results.checks.sampleQuery && Object.keys(results.checks.sampleQuery).length > 0) {
    lines.push('🔍 SAMPLE QUERIES:');
    for (const [query, result] of Object.entries(results.checks.sampleQuery)) {
      lines.push(`  ${query}: ${result.status}`);
      if (result.message) {
        lines.push(`    └─ ${result.message}`);
      }
      if (result.error) {
        lines.push(`    └─ ERROR: ${result.error}`);
      }
    }
    lines.push('');
  }

  // Authentication
  if (results.checks.authentication) {
    lines.push('🔐 AUTHENTICATION:');
    lines.push(`  Status: ${results.checks.authentication.message}`);
    lines.push('');
  }

  // Warnings
  if (results.warnings.length > 0) {
    lines.push('⚠️  WARNINGS:');
    results.warnings.forEach(w => {
      lines.push(`  • ${w}`);
    });
    lines.push('');
  }

  // Errors
  if (results.errors.length > 0) {
    lines.push('❌ ERRORS:');
    results.errors.forEach(e => {
      lines.push(`  • ${e}`);
    });
    lines.push('');
  }

  // Recovery Instructions
  if (results.summary.overallStatus !== 'OK' || results.warnings.length > 0) {
    lines.push('💡 SOLUSI:');
    if (results.summary.configurationStatus === 'FAILED') {
      lines.push('  1. Pastikan .env file ada dan berisi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY');
      lines.push('  2. Salin dari .env.example atau .env.production');
    }
    if (results.summary.connectivityStatus === 'FAILED') {
      lines.push('  1. Periksa koneksi internet');
      lines.push('  2. Verifikasi URL Supabase benar');
      lines.push('  3. Periksa API Key valid di Supabase dashboard');
    }
    if (results.summary.missingTables?.length > 0) {
      lines.push(`  1. Tabel berikut belum dibuat: ${results.summary.missingTables.join(', ')}`);
      lines.push('  2. Jalankan SQL migration di Supabase SQL Editor');
      lines.push('  3. Lihat RH_SETUP_INSTRUCTIONS.md untuk SQL script');
    }
    lines.push('');
  }

  lines.push('⏱️  Timestamp: ' + results.timestamp);

  return lines.join('\n');
}

/**
 * Utility untuk menjalankan check dan log hasilnya
 */
export async function runAndLogCheck() {
  console.log('🔄 Checking Supabase connector...\n');
  const results = await checkSupabaseConnector();
  const formatted = formatCheckResults(results);
  console.log(formatted);
  return results;
}
