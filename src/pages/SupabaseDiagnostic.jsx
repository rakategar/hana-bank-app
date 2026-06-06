import { useState, useEffect } from 'react';
import { checkSupabaseConnector, formatCheckResults } from '../lib/supabaseConnectorCheck';

export default function SupabaseDiagnostic() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    runCheck();
  }, []);

  const runCheck = async () => {
    try {
      setLoading(true);
      setError(null);
      const checkResults = await checkSupabaseConnector();
      setResults(checkResults);
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-center text-gray-600">Checking Supabase connector...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full border-l-4 border-red-500">
          <h1 className="text-2xl font-bold text-red-700 mb-4">❌ Check Failed</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={runCheck}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    if (!status) return 'text-gray-600';
    if (status === 'OK') return 'text-green-600';
    if (status === 'FAILED') return 'text-red-600';
    if (status === 'INCOMPLETE') return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getStatusIcon = (status) => {
    if (!status) return '❓';
    if (status === 'OK' || status === 'READY') return '✓';
    if (status === 'FAILED') return '✗';
    if (status === 'INCOMPLETE') return '⚠';
    return '❓';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6">
            <h1 className="text-3xl font-bold mb-2">Supabase Connector Check</h1>
            <p className="text-indigo-100">Diagnostic report for database connectivity</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">📊 Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded border border-gray-300">
                  <p className="text-sm text-gray-600">Overall</p>
                  <p className={`font-bold text-lg ${getStatusColor(results.summary.overallStatus)}`}>
                    {getStatusIcon(results.summary.overallStatus)} {results.summary.overallStatus || 'N/A'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-300">
                  <p className="text-sm text-gray-600">Config</p>
                  <p className={`font-bold text-lg ${getStatusColor(results.summary.configurationStatus)}`}>
                    {getStatusIcon(results.summary.configurationStatus)} {results.summary.configurationStatus || 'N/A'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-300">
                  <p className="text-sm text-gray-600">Connectivity</p>
                  <p className={`font-bold text-lg ${getStatusColor(results.checks.connectivity?.status)}`}>
                    {getStatusIcon(results.checks.connectivity?.status)} {results.checks.connectivity?.status || 'N/A'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-300">
                  <p className="text-sm text-gray-600">Tables</p>
                  <p className={`font-bold text-lg ${getStatusColor(results.summary.tablesStatus)}`}>
                    {getStatusIcon(results.summary.tablesStatus)} {results.summary.tablesStatus || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Configuration */}
            {results.checks.configuration && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">⚙️ Configuration</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">URL Configured:</span>
                    <span className={results.checks.configuration.urlConfigured ? 'text-green-600' : 'text-red-600'}>
                      {results.checks.configuration.urlConfigured ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Key Configured:</span>
                    <span className={results.checks.configuration.keyConfigured ? 'text-green-600' : 'text-red-600'}>
                      {results.checks.configuration.keyConfigured ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">App Mode:</span>
                    <span className="text-gray-800 font-medium">{results.checks.configuration.appMode}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tables */}
            {results.checks.tables && Object.keys(results.checks.tables).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  📋 Tables ({results.summary.existingTables || 0}/{Object.keys(results.checks.tables).length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(results.checks.tables).map(([table, status]) => (
                    <div key={table} className="bg-white p-3 rounded border border-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{table}</span>
                        <span className={status === 'OK' ? 'text-green-600' : status === 'MISSING' ? 'text-red-600' : 'text-yellow-600'}>
                          {status === 'OK' ? '✓' : status === 'MISSING' ? '✗' : '⚠'}
                        </span>
                      </div>
                      {status !== 'OK' && status !== 'MISSING' && (
                        <p className="text-xs text-gray-500 mt-1">{status}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Queries */}
            {results.checks.sampleQuery && Object.keys(results.checks.sampleQuery).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">🔍 Sample Queries</h2>
                <div className="space-y-2 text-sm">
                  {Object.entries(results.checks.sampleQuery).map(([query, result]) => (
                    <div key={query} className="flex justify-between items-start">
                      <span className="text-gray-600">{query}</span>
                      <span className={result.status === 'OK' ? 'text-green-600' : 'text-yellow-600'}>
                        {typeof result === 'string' ? result : result.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {results.warnings && results.warnings.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-300">
                <h2 className="text-lg font-semibold text-yellow-800 mb-3">⚠️ Warnings</h2>
                <ul className="space-y-2 text-sm text-yellow-700">
                  {results.warnings.map((warning, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {results.errors && results.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-300">
                <h2 className="text-lg font-semibold text-red-800 mb-3">❌ Errors</h2>
                <ul className="space-y-2 text-sm text-red-700">
                  {results.errors.map((err, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raw JSON */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <details>
                <summary className="cursor-pointer text-gray-700 font-medium">🔧 Raw JSON Data</summary>
                <pre className="mt-3 bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </details>
            </div>

            {/* Timestamp */}
            <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
              Last checked: {new Date(results.timestamp).toLocaleString()}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 p-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {results.summary.overallStatus === 'OK' || results.summary.overallStatus === 'READY'
                ? '✅ Database connection ready'
                : '⚠️ Review issues above'}
            </p>
            <button
              onClick={runCheck}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded text-sm"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
