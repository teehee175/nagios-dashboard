import type { HostTotals, ServiceTotals } from '../types/nagios';
import './StatusSummary.css';

interface StatusSummaryProps {
  hostTotals: HostTotals;
  serviceTotals: ServiceTotals;
  lastUpdated: string;
}

export function StatusSummary({ hostTotals, serviceTotals, lastUpdated }: StatusSummaryProps) {
  return (
    <div className="status-summary">
      <div className="summary-header">
        <h2>Network Status Overview</h2>
        <span className="last-updated">Last Updated: {lastUpdated}</span>
      </div>

      <div className="summary-cards">
        <div className="summary-section">
          <h3>Hosts</h3>
          <div className="totals-grid">
            <div className="total-card up">
              <span className="count">{hostTotals.up}</span>
              <span className="label">Up</span>
            </div>
            <div className="total-card down">
              <span className="count">{hostTotals.down}</span>
              <span className="label">Down</span>
            </div>
            <div className="total-card unreachable">
              <span className="count">{hostTotals.unreachable}</span>
              <span className="label">Unreachable</span>
            </div>
            <div className="total-card pending">
              <span className="count">{hostTotals.pending}</span>
              <span className="label">Pending</span>
            </div>
          </div>
          <div className="total-bar">
            <span className="problems">{hostTotals.allProblems} Problems</span>
            <span className="total">{hostTotals.allTypes} Total</span>
          </div>
        </div>

        <div className="summary-section">
          <h3>Services</h3>
          <div className="totals-grid services">
            <div className="total-card ok">
              <span className="count">{serviceTotals.ok}</span>
              <span className="label">OK</span>
            </div>
            <div className="total-card warning">
              <span className="count">{serviceTotals.warning}</span>
              <span className="label">Warning</span>
            </div>
            <div className="total-card unknown">
              <span className="count">{serviceTotals.unknown}</span>
              <span className="label">Unknown</span>
            </div>
            <div className="total-card critical">
              <span className="count">{serviceTotals.critical}</span>
              <span className="label">Critical</span>
            </div>
            <div className="total-card pending">
              <span className="count">{serviceTotals.pending}</span>
              <span className="label">Pending</span>
            </div>
          </div>
          <div className="total-bar">
            <span className="problems">{serviceTotals.allProblems} Problems</span>
            <span className="total">{serviceTotals.allTypes} Total</span>
          </div>
        </div>
      </div>
    </div>
  );
}
