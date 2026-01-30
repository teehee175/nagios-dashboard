import { useMemo } from 'react';
import type { ServiceEntry } from '../types/nagios';
import './WindowsUpdatePanel.css';

interface WindowsUpdatePanelProps {
  services: ServiceEntry[];
}

interface UpdateHost {
  host: string;
  hostShort: string;
  status: 'CRITICAL' | 'WARNING' | 'OK';
  criticalUpdates: number;
  optionalUpdates: number;
  rebootRequired: boolean;
  statusInfo: string;
}

export function WindowsUpdatePanel({ services }: WindowsUpdatePanelProps) {
  // Process and categorize in a single pass
  const { criticalHosts, rebootHosts, optionalHosts, okHosts, totalCount } = useMemo(() => {
    const critical: UpdateHost[] = [];
    const reboot: UpdateHost[] = [];
    const optional: UpdateHost[] = [];
    const ok: UpdateHost[] = [];
    const updateRegex = /(\d+)\s*critical.*?(\d+)\s*optional/;

    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      if (s.service !== 'Windows Update') continue;

      const info = s.statusInfo.toLowerCase();
      let criticalUpdates = 0;
      let optionalUpdates = 0;
      const rebootRequired = info.includes('reboot required');

      const updateMatch = info.match(updateRegex);
      if (updateMatch) {
        criticalUpdates = parseInt(updateMatch[1], 10);
        optionalUpdates = parseInt(updateMatch[2], 10);
      }

      const hostShort = s.host.includes(' - ')
        ? s.host.substring(s.host.lastIndexOf(' - ') + 3)
        : s.host;

      const host: UpdateHost = {
        host: s.host,
        hostShort,
        status: s.status as 'CRITICAL' | 'WARNING' | 'OK',
        criticalUpdates,
        optionalUpdates,
        rebootRequired,
        statusInfo: s.statusInfo,
      };

      // Categorize directly instead of filtering later
      if (criticalUpdates > 0) {
        critical.push(host);
      } else if (rebootRequired) {
        reboot.push(host);
      } else if (optionalUpdates > 0) {
        optional.push(host);
      } else if (s.status === 'OK') {
        ok.push(host);
      }
    }

    return {
      criticalHosts: critical,
      rebootHosts: reboot,
      optionalHosts: optional,
      okHosts: ok,
      totalCount: critical.length + reboot.length + optional.length + ok.length
    };
  }, [services]);

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="windows-update-panel">
      <div className="wu-header">
        <span className="wu-title">Windows Updates</span>
        <span className="wu-count">{totalCount}</span>
      </div>

      {criticalHosts.length > 0 && (
        <div className="wu-section critical">
          <div className="wu-section-header">
            <span className="wu-section-icon">⚠</span>
            <span>Critical Updates ({criticalHosts.length})</span>
          </div>
          <div className="wu-list">
            {criticalHosts.map(h => (
              <div key={h.host} className="wu-item critical" title={h.statusInfo}>
                <span className="wu-host">{h.hostShort}</span>
                <span className="wu-badge">{h.criticalUpdates}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rebootHosts.length > 0 && (
        <div className="wu-section warning">
          <div className="wu-section-header">
            <span className="wu-section-icon">↻</span>
            <span>Reboot Required ({rebootHosts.length})</span>
          </div>
          <div className="wu-list">
            {rebootHosts.map(h => (
              <div key={h.host} className="wu-item warning" title={h.statusInfo}>
                <span className="wu-host">{h.hostShort}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {optionalHosts.length > 0 && (
        <div className="wu-section optional">
          <div className="wu-section-header">
            <span className="wu-section-icon">○</span>
            <span>Optional Updates ({optionalHosts.length})</span>
          </div>
          <div className="wu-list">
            {optionalHosts.map(h => (
              <div key={h.host} className="wu-item optional" title={h.statusInfo}>
                <span className="wu-host">{h.hostShort}</span>
                <span className="wu-badge">{h.optionalUpdates}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {okHosts.length > 0 && (
        <div className="wu-section ok">
          <div className="wu-section-header">
            <span className="wu-section-icon">✓</span>
            <span>Up to Date ({okHosts.length})</span>
          </div>
        </div>
      )}
    </div>
  );
}
