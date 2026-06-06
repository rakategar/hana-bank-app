# Supabase Connector Check Guide

This guide explains how to verify and diagnose your Supabase connection and database setup.

## Overview

The Supabase connector check provides three ways to verify your database connectivity:

1. **CLI Script** - Run from command line (best for CI/CD and development)
2. **Browser Diagnostic Page** - Visual interface (best for quick checks)
3. **Programmatic API** - Use in your code (best for custom integrations)

## Prerequisites

- Node.js 16+ installed
- `.env` or `.env.production` file with Supabase credentials:
  - `VITE_SUPABASE_URL` - Your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Your public anon API key

## Method 1: CLI Script (Recommended for Development)

### Running the Check

```bash
npm run check-supabase
```

Or directly:
```bash
node scripts/checkSupabase.js
```

### Output Example

```
📊 SUPABASE CONNECTOR CHECK RESULTS
============================================================

✨ Summary:
  Overall: READY
  Config: OK
  Tables: OK (8 exist, 0 missing)

✓ users
✓ daily_activities
✓ weekly_plans
✓ ai_scores
✓ supervisor_summaries
✓ extra_plans
✓ warnings
✓ rh_credentials

✅ Supabase connector is ready!
```

### What It Checks

- ✅ Environment variables configured
- ✅ Supabase client initialization
- ✅ Network connectivity
- ✅ Database access
- ✅ Required tables existence
- ✅ Sample query execution

## Method 2: Browser Diagnostic Page

### Accessing the Diagnostic Page

1. Add the route to your `App.jsx`:

```jsx
import SupabaseDiagnostic from './pages/SupabaseDiagnostic';

// In your router:
{
  path: '/admin/supabase-diagnostic',
  element: <SupabaseDiagnostic />
}
```

2. Start the dev server:
```bash
npm run dev
```

3. Visit: `http://localhost:5173/admin/supabase-diagnostic`

### Features

- 📊 Visual status indicators
- 📋 Table-by-table health check
- 🔍 Sample query results
- ⚠️ Warnings and error display
- 🔄 One-click refresh
- 📥 Raw JSON export

## Method 3: Programmatic API

### Using in Your Code

```javascript
import { checkSupabaseConnector, formatCheckResults } from './lib/supabaseConnectorCheck';

// Run the check
const results = await checkSupabaseConnector();

// Format and display
const formatted = formatCheckResults(results);
console.log(formatted);

// Access specific results
if (results.summary.overallStatus === 'OK') {
  console.log('✅ Database is ready!');
}
```

### Result Structure

```javascript
{
  timestamp: "2024-06-06T10:30:00Z",
  checks: {
    configuration: { urlConfigured: true, keyConfigured: true },
    clientInitialization: { status: "OK" },
    connectivity: { status: "OK", message: "..." },
    tables: { 
      users: "OK", 
      daily_activities: "OK",
      // ...
    },
    sampleQuery: { users: { status: "OK", recordCount: 15 } },
    authentication: { authenticated: false, message: "..." }
  },
  summary: {
    overallStatus: "OK",
    configurationStatus: "OK",
    tablesStatus: "OK",
    existingTables: 8,
    missingTables: 0
  },
  errors: [],
  warnings: []
}
```

## Understanding the Results

### Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| `OK` / `READY` | ✅ Everything working | No action needed |
| `INCOMPLETE` | ⚠️ Partially working | Check warnings section |
| `FAILED` | ❌ Connection broken | See error section |

### Common Issues and Solutions

#### ❌ Configuration Not Found

**Problem:** `VITE_SUPABASE_URL not configured`

**Solution:**
1. Create `.env` file in project root:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```
2. Copy from `.env.production` or `.env.example`
3. Get values from Supabase dashboard → Settings → API

#### 🔗 Connection Failed

**Problem:** `Connected (table users not yet created)`

**Solution:**
1. Tables need to be created via SQL migrations
2. Run the SQL script in Supabase SQL Editor:
   ```bash
   # Copy SQL from RH_SETUP_INSTRUCTIONS.md
   # Or check docs/RH_CREDENTIALS_SETUP.md
   ```
3. Re-run the check after creating tables

#### ❌ Table Not Found (PGRST116)

**Problem:** Specific table shows `MISSING`

**Solution:**
1. This is expected if database hasn't been initialized
2. Run migrations: Follow `RH_SETUP_INSTRUCTIONS.md`
3. Or manually create tables in Supabase dashboard

#### 🔐 RLS Policy Denied Access

**Problem:** Table exists but shows RLS/Policy error

**Solution:**
1. Row Level Security is enabled (expected)
2. Check RLS policies in Supabase dashboard
3. Ensure anon user has proper SELECT permissions
4. Or use appropriate authentication

### Environment Variables Reference

```env
# Required
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional
VITE_APP_MODE=live|demo
VITE_AI_ENABLED=true|false
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Check Supabase Connection
  run: npm run check-supabase
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### Vercel Deployment Check

```bash
# Add to Vercel build command
npm run check-supabase && npm run build
```

## Debug Mode

For more verbose output, check the browser console or Node logs.

### Browser Console Debug

```javascript
// In browser console
import { checkSupabaseConnector } from '/src/lib/supabaseConnectorCheck.js';
const results = await checkSupabaseConnector();
console.table(results.checks);
console.table(results.summary);
```

### CLI Debug Output

```bash
# The script already outputs detailed information
# Check for specific error messages in the output
node scripts/checkSupabase.js 2>&1 | grep -i error
```

## Troubleshooting

### Script won't run

```bash
# Ensure dotenv is installed
npm install dotenv @supabase/supabase-js

# Make script executable (Linux/Mac)
chmod +x scripts/checkSupabase.js

# Run with Node explicitly
node scripts/checkSupabase.js
```

### Wrong environment variables loaded

```bash
# Verify which .env file is being used
node -e "require('dotenv').config(); console.log(process.env.VITE_SUPABASE_URL)"

# Or check in browser
console.log(import.meta.env.VITE_SUPABASE_URL)
```

### Connection timeout

- Check internet connection
- Verify Supabase project is active (not paused)
- Check if project URL is correct in Supabase dashboard

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [RH Setup Instructions](./RH_SETUP_INSTRUCTIONS.md)
- [RH Credentials Setup](./docs/RH_CREDENTIALS_SETUP.md)
- [Database Schema](./docs/schema.sql)

## Support

For issues or questions:
1. Check the error message in the check output
2. Review the "Solution" section in the output
3. Check database setup docs
4. Verify Supabase dashboard settings

---

**Last Updated:** June 6, 2024
