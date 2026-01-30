import { useMemo } from 'react';
import { useNagiosStatus } from './hooks/useNagiosStatus';
import { StatusSummary } from './components/StatusSummary';
import { ServiceTable } from './components/ServiceTable';
import { WindowsUpdatePanel } from './components/WindowsUpdatePanel';
import { ServiceCheckPanel } from './components/ServiceCheckPanel';
import './App.css';

function App() {
  const { status, loading, error, lastFetch, refresh } = useNagiosStatus();

  // Filter out Windows Update and Service Check services from main table
  const filteredServices = useMemo(() => {
    if (!status?.services) return [];
    return status.services.filter(s => {
      const serviceLower = s.service.toLowerCase();
      return !serviceLower.includes('windows update') &&
             serviceLower !== 'service check';
    });
  }, [status?.services]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Nagios Dashboard</h1>
          <div className="header-actions">
            {lastFetch && (
              <span className="fetch-time">
                Fetched: {lastFetch.toLocaleTimeString()}
              </span>
            )}
            <button
              className="refresh-btn"
              onClick={refresh}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner">
            <span>Error: {error}</span>
            <button onClick={refresh}>Retry</button>
          </div>
        )}

        {loading && !status && (
          <div className="loading">
            <div className="spinner"></div>
            <span>Loading Nagios status...</span>
          </div>
        )}

        {status && (
          <>
            <StatusSummary
              hostTotals={status.hostTotals}
              serviceTotals={status.serviceTotals}
              lastUpdated={status.lastUpdated}
            />
            <div className="main-content">
              <ServiceTable services={filteredServices} />
              <div className="side-panels">
                <WindowsUpdatePanel services={status.services} />
                <ServiceCheckPanel services={status.services} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
